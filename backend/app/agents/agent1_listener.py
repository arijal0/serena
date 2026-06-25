"""Agent 1 — The Intake Listener (Serena).

Captures unfiltered patient testimony, strips dismissive framing, preserves
intensity, and emits Schema 1 (IntakePayload).
"""

from __future__ import annotations

import json

from app.gemini_client import generate_structured
from app.prompts.agent1_listener import AGENT1_SYSTEM_INSTRUCTION
from app.schemas import (
    IntakeMetadata,
    IntakePayload,
    IntakeRequest,
    QualitativeInputs,
    QuantitativeInputs,
)


def _build_user_content(request: IntakeRequest, session_id: str) -> str:
    payload = {
        "session_id": session_id,
        "preferred_language": request.preferred_language,
        "input_modality": request.input_modality.value,
        "self_reported_pain_score": request.self_reported_pain_score,
        "quick_select_flags": request.quick_select_flags,
        "raw_patient_narrative": request.raw_patient_narrative,
        "additional_context": request.additional_context or "",
    }
    return (
        "Capture this triage intake into Schema 1. Preserve the raw narrative "
        "verbatim and produce a faithful, de-hedged English translation.\n\n"
        f"INTAKE:\n{json.dumps(payload, ensure_ascii=False, indent=2)}"
    )


def run_intake_listener(request: IntakeRequest, session_id: str) -> IntakePayload:
    """Execute Agent 1 and return a validated Schema 1 payload.

    The LLM authors the qualitative fields; metadata + quantitative inputs are
    set deterministically from the request so they can never be altered.
    """
    user_content = _build_user_content(request, session_id)

    llm_result = generate_structured(
        system_instruction=AGENT1_SYSTEM_INSTRUCTION,
        user_content=user_content,
        response_schema=IntakePayload,
    )

    # Pin the machine-owned fields; trust the model only for the qualitative text.
    return IntakePayload(
        intake_metadata=IntakeMetadata(
            session_id=session_id,
            preferred_language=request.preferred_language,
            input_modality=request.input_modality,
            patient_name=request.patient_name,
            patient_id=request.patient_id,
            additional_context=request.additional_context,
        ),
        quantitative_inputs=QuantitativeInputs(
            self_reported_pain_score=request.self_reported_pain_score,
            quick_select_flags=request.quick_select_flags,
        ),
        qualitative_inputs=QualitativeInputs(
            # Never let the model rewrite the verbatim record.
            raw_patient_narrative=request.raw_patient_narrative,
            normalized_english_translation=(
                llm_result.qualitative_inputs.normalized_english_translation
            ),
        ),
    )
