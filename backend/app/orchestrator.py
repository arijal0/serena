"""Sequential orchestration of the three-agent Serena pipeline.

    IntakeRequest ─▶ Agent 1 ─▶ Schema 1 ─▶ Agent 2 ─▶ Schema 2 ─▶ Agent 3 ─▶ Schema 3

Provides both a blocking `run_pipeline` and an SSE-friendly `stream_pipeline`
generator so the React "Agent Pipeline Monitor" can render each handoff live.
"""

from __future__ import annotations

import json
import logging
from collections.abc import Iterator
from uuid import uuid4

from app.agents import (
    run_clinical_translator,
    run_intake_listener,
    run_protocol_enforcer,
)
from app.schemas import IntakeRequest, PipelineResult

logger = logging.getLogger("serena.orchestrator")


def run_pipeline(request: IntakeRequest) -> PipelineResult:
    """Run all three agents in sequence and return the combined result."""
    session_id = request.session_id or str(uuid4())

    intake_payload = run_intake_listener(request, session_id)
    clinical_assessment = run_clinical_translator(intake_payload)
    enforcement_alert = run_protocol_enforcer(clinical_assessment, intake_payload)

    return PipelineResult(
        session_id=session_id,
        intake_payload=intake_payload,
        clinical_assessment=clinical_assessment,
        enforcement_alert=enforcement_alert,
    )


def _sse(event: str, data: dict) -> str:
    """Format a Server-Sent Event frame."""
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def stream_pipeline(request: IntakeRequest) -> Iterator[str]:
    """Yield SSE frames as each agent starts and completes.

    Event sequence:
      pipeline_start
      agent_start (agent=1) / agent_complete (agent=1, payload=Schema 1)
      agent_start (agent=2) / agent_complete (agent=2, payload=Schema 2)
      agent_start (agent=3) / agent_complete (agent=3, payload=Schema 3)
      pipeline_complete  |  pipeline_error
    """
    session_id = request.session_id or str(uuid4())

    try:
        yield _sse("pipeline_start", {"session_id": session_id})

        yield _sse("agent_start", {"agent": 1, "name": "Intake Listener", "session_id": session_id})
        intake_payload = run_intake_listener(request, session_id)
        yield _sse(
            "agent_complete",
            {"agent": 1, "name": "Intake Listener", "schema": 1,
             "payload": intake_payload.model_dump(mode="json")},
        )

        yield _sse("agent_start", {"agent": 2, "name": "Clinical Translator", "session_id": session_id})
        clinical_assessment = run_clinical_translator(intake_payload)
        yield _sse(
            "agent_complete",
            {"agent": 2, "name": "Clinical Translator", "schema": 2,
             "payload": clinical_assessment.model_dump(mode="json")},
        )

        yield _sse("agent_start", {"agent": 3, "name": "Protocol Enforcer", "session_id": session_id})
        enforcement_alert = run_protocol_enforcer(clinical_assessment, intake_payload)
        yield _sse(
            "agent_complete",
            {"agent": 3, "name": "Protocol Enforcer", "schema": 3,
             "payload": enforcement_alert.model_dump(mode="json")},
        )

        result = PipelineResult(
            session_id=session_id,
            intake_payload=intake_payload,
            clinical_assessment=clinical_assessment,
            enforcement_alert=enforcement_alert,
        )
        yield _sse("pipeline_complete", result.model_dump(mode="json"))
    except Exception as exc:  # surface a clean error frame to the UI
        logger.exception("Pipeline failed for session %s", session_id)
        yield _sse("pipeline_error", {"session_id": session_id, "error": str(exc)})
