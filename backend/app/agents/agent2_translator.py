"""Agent 2 — The Clinical Translator.

Maps Schema 1 testimony onto standardized obstetric terminology + ACOG red flags
and assigns an urgency tier, emitting Schema 2 (ClinicalAssessment).

A deterministic safety net augments the LLM: every quick-select flag is resolved
against the ACOG catalog so a known red flag can never be missed, and the assigned
tier is floored to the highest matched red-flag tier (anti-dismissal guarantee).
"""

from __future__ import annotations

from app.gemini_client import generate_structured
from app.knowledge.acog_protocols import RED_FLAG_BY_ID, lookup_red_flag
from app.prompts.agent2_translator import AGENT2_SYSTEM_INSTRUCTION
from app.schemas import (
    Agent2Metadata,
    ClinicalAssessment,
    ClinicalExtraction,
    IntakePayload,
    UrgencyAssessment,
    UrgencyTier,
)

_TIER_ORDER = {
    UrgencyTier.LOW: 0,
    UrgencyTier.MEDIUM: 1,
    UrgencyTier.HIGH: 2,
    UrgencyTier.CRITICAL: 3,
}


def _build_user_content(intake: IntakePayload) -> str:
    return (
        "Translate this intake (Schema 1) into Schema 2. Map symptoms, detect ACOG "
        "red flags, and assign an urgency tier.\n\n"
        f"SCHEMA_1:\n{intake.model_dump_json(indent=2)}"
    )


def _max_tier(tiers: list[UrgencyTier]) -> UrgencyTier:
    return max(tiers, key=lambda t: _TIER_ORDER[t])


def run_clinical_translator(intake: IntakePayload) -> ClinicalAssessment:
    session_id = intake.intake_metadata.session_id

    llm_result = generate_structured(
        system_instruction=AGENT2_SYSTEM_INSTRUCTION,
        user_content=_build_user_content(intake),
        response_schema=ClinicalAssessment,
    )

    # ------------------------------------------------------------------ #
    # Deterministic safety net: never lose a red flag the patient tapped.
    # ------------------------------------------------------------------ #
    matched_ids: set[str] = set()
    for flag_id in llm_result.clinical_extraction.specific_red_flags:
        if flag_id in RED_FLAG_BY_ID:
            matched_ids.add(flag_id)

    for token in intake.quantitative_inputs.quick_select_flags:
        rf = lookup_red_flag(token)
        if rf is not None:
            matched_ids.add(rf.id)

    specific_red_flags = sorted(matched_ids)
    red_flags_present = len(specific_red_flags) > 0

    # Floor the tier to the most severe matched red flag (can raise, never lower).
    candidate_tiers = [llm_result.urgency_assessment.assigned_tier]
    for fid in specific_red_flags:
        candidate_tiers.append(RED_FLAG_BY_ID[fid].tier)
    final_tier = _max_tier(candidate_tiers)

    rationale = llm_result.urgency_assessment.rationale
    if final_tier != llm_result.urgency_assessment.assigned_tier:
        rationale += (
            f" [Safety floor applied: tier raised to {final_tier.value} based on "
            f"confirmed ACOG red flag(s): {', '.join(specific_red_flags)}.]"
        )

    return ClinicalAssessment(
        intake_metadata=Agent2Metadata(session_id=session_id),
        clinical_extraction=ClinicalExtraction(
            identified_symptoms=llm_result.clinical_extraction.identified_symptoms,
            acog_red_flags_present=red_flags_present,
            specific_red_flags=specific_red_flags,
        ),
        urgency_assessment=UrgencyAssessment(
            assigned_tier=final_tier,
            rationale=rationale,
        ),
    )
