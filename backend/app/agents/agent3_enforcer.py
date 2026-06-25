"""Agent 3 — The Protocol Enforcer.

Converts Schema 2 into the terminal Schema 3 decision. Everything that must be
reproducible — the escalation STATUS, the presentation `display` block, and the
ACOG citation list — is computed deterministically. The LLM only authors the
human-facing prose (required staff action + audit rationale), constrained to the
already-decided status. This split makes the disposition impossible to silently
soften via model variance.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.gemini_client import generate_structured
from app.knowledge.acog_protocols import (
    RED_FLAG_BY_ID,
    STATUS_ACTION_TEMPLATE,
    STATUS_DISPLAY,
    TIER_TO_STATUS,
    protocol_references_for,
)
from app.prompts.agent3_enforcer import AGENT3_SYSTEM_INSTRUCTION
from app.schemas import (
    AuditTrail,
    ClinicalAssessment,
    EnforcementAlert,
    EnforcementDisplay,
    EnforcementMetadata,
    EscalationDecision,
    EscalationStatus,
    IntakePayload,
)


class _EnforcerDraft(BaseModel):
    """The only fields the LLM authors; the rest is computed deterministically."""

    required_staff_action: str = Field(...)
    system_rationale: str = Field(...)


def compute_status(assessment: ClinicalAssessment) -> EscalationStatus:
    """Deterministic ACOG enforcement matrix + anti-dismissal safety override."""
    tier = assessment.urgency_assessment.assigned_tier
    status = TIER_TO_STATUS[tier]

    # Safety override: if any red flag is present, never allow STANDARD_QUEUE.
    if assessment.clinical_extraction.acog_red_flags_present:
        if status == EscalationStatus.STANDARD_QUEUE:
            status = EscalationStatus.PRIORITY_OBSERVATION

    # Hard override: presence of any CRITICAL-catalog red flag forces escalation.
    for fid in assessment.clinical_extraction.specific_red_flags:
        rf = RED_FLAG_BY_ID.get(fid)
        if rf is not None and rf.tier.value == "CRITICAL":
            return EscalationStatus.IMMEDIATE_ESCALATION

    return status


def _build_user_content(
    assessment: ClinicalAssessment,
    status: EscalationStatus,
    references: list[str],
) -> str:
    return (
        "Author the enforcement decision for this clinical assessment.\n"
        f"The deterministic system has ALREADY decided the status: {status.value}. "
        "You MUST write a required_staff_action and system_rationale consistent with "
        "exactly this status. Cite the governing protocols in the rationale.\n\n"
        f"GOVERNING PROTOCOL REFERENCES: {references}\n\n"
        f"SCHEMA_2:\n{assessment.model_dump_json(indent=2)}"
    )


def _build_display(
    assessment: ClinicalAssessment,
    status: EscalationStatus,
    references: list[str],
    intake: IntakePayload | None,
) -> EnforcementDisplay:
    flags = assessment.clinical_extraction.specific_red_flags
    labels = [RED_FLAG_BY_ID[f].label for f in flags if f in RED_FLAG_BY_ID]
    style = STATUS_DISPLAY[status]
    return EnforcementDisplay(
        acuity=style["acuity"],
        headline=style["headline"],
        status_color=style["status_color"],
        triggered_flag_count=len(flags),
        triggered_flag_labels=labels,
        acog_citations=references,
        patient_name=intake.intake_metadata.patient_name if intake else None,
        patient_id=intake.intake_metadata.patient_id if intake else None,
    )


def run_protocol_enforcer(
    assessment: ClinicalAssessment,
    intake: IntakePayload | None = None,
) -> EnforcementAlert:
    session_id = assessment.intake_metadata.session_id
    status = compute_status(assessment)
    references = protocol_references_for(assessment.clinical_extraction.specific_red_flags)

    draft = generate_structured(
        system_instruction=AGENT3_SYSTEM_INSTRUCTION,
        user_content=_build_user_content(assessment, status, references),
        response_schema=_EnforcerDraft,
    )

    staff_action = draft.required_staff_action.strip() or STATUS_ACTION_TEMPLATE[status]

    rationale = draft.system_rationale.strip()
    if not rationale:
        flags = ", ".join(assessment.clinical_extraction.specific_red_flags) or "none"
        rationale = (
            f"Tier {assessment.urgency_assessment.assigned_tier.value} with red flags "
            f"[{flags}] maps to {status.value} per the ACOG enforcement matrix. "
            f"References: {'; '.join(references)}."
        )

    return EnforcementAlert(
        enforcement_metadata=EnforcementMetadata(session_id=session_id),
        escalation_decision=EscalationDecision(
            status=status,
            required_staff_action=staff_action,
        ),
        audit_trail=AuditTrail(system_rationale=rationale),
        display=_build_display(assessment, status, references, intake),
    )
