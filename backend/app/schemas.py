"""Versioned data contracts for the Serena agentic pipeline.

These models are the single source of truth for every handoff:

    Client ──▶ Agent 1 ──▶ [Schema 1] ──▶ Agent 2 ──▶ [Schema 2] ──▶ Agent 3 ──▶ [Schema 3]

Field descriptions are intentionally verbose because they are passed to Gemini
as the `response_schema`; the model reads them as inline extraction guidance.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from uuid import uuid4

from pydantic import BaseModel, Field


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_session_id() -> str:
    return str(uuid4())


# --------------------------------------------------------------------------- #
# Enums
# --------------------------------------------------------------------------- #
class InputModality(str, Enum):
    TEXT = "text"
    VOICE_TO_TEXT = "voice_to_text"


class UrgencyTier(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class EscalationStatus(str, Enum):
    STANDARD_QUEUE = "STANDARD_QUEUE"
    PRIORITY_OBSERVATION = "PRIORITY_OBSERVATION"
    IMMEDIATE_ESCALATION = "IMMEDIATE_ESCALATION"


# --------------------------------------------------------------------------- #
# Client → API: the raw intake captured on the tablet
# --------------------------------------------------------------------------- #
class IntakeRequest(BaseModel):
    """Payload the React tablet UI submits when the patient taps 'Submit'."""

    self_reported_pain_score: int = Field(
        ..., ge=0, le=10, description="Patient-selected pain on a 0-10 slider."
    )
    quick_select_flags: list[str] = Field(
        default_factory=list,
        description="Symptom card IDs/labels the patient tapped (e.g. 'severe_headache').",
    )
    raw_patient_narrative: str = Field(
        default="",
        description="Free-text (or voice-to-text) testimony in the patient's own words.",
    )
    preferred_language: str = Field(
        default="en", description="BCP-47 language code or plain language name."
    )
    input_modality: InputModality = Field(default=InputModality.TEXT)
    session_id: Optional[str] = Field(
        default=None,
        description="Optional client-supplied session id; one is generated if absent.",
    )
    patient_name: Optional[str] = Field(
        default=None, description="Patient's first and last name (as entered on the tablet)."
    )
    patient_id: Optional[str] = Field(
        default=None, description="Client-generated patient/encounter identifier (e.g. 'P-2026-U8Q47')."
    )
    additional_context: Optional[str] = Field(
        default=None,
        description="Optional free-text: allergies, weeks pregnant, medications, prior provider, etc.",
    )


# --------------------------------------------------------------------------- #
# Schema 1 — Agent 1 (Intake Listener) → Agent 2
# --------------------------------------------------------------------------- #
class IntakeMetadata(BaseModel):
    session_id: str = Field(default_factory=_new_session_id)
    timestamp_utc: str = Field(default_factory=_utc_now_iso)
    preferred_language: str = "en"
    input_modality: InputModality = InputModality.TEXT
    patient_name: Optional[str] = None
    patient_id: Optional[str] = None
    additional_context: Optional[str] = Field(
        default=None,
        description="Patient-supplied context (allergies, gestational age, meds). Carried verbatim.",
    )


class QuantitativeInputs(BaseModel):
    self_reported_pain_score: int = Field(..., ge=0, le=10)
    quick_select_flags: list[str] = Field(default_factory=list)


class QualitativeInputs(BaseModel):
    raw_patient_narrative: str = Field(
        ..., description="Verbatim testimony, preserved exactly as the patient said it."
    )
    normalized_english_translation: str = Field(
        ...,
        description=(
            "Faithful English rendering of the narrative with dismissive/self-minimizing "
            "framing stripped and psychological intensity preserved. NOT a clinical summary."
        ),
    )


class IntakePayload(BaseModel):
    """Schema 1 — the unfiltered, advocacy-preserving intake contract."""

    intake_metadata: IntakeMetadata
    quantitative_inputs: QuantitativeInputs
    qualitative_inputs: QualitativeInputs


# --------------------------------------------------------------------------- #
# Schema 2 — Agent 2 (Clinical Translator) → Agent 3
# --------------------------------------------------------------------------- #
class Agent2Metadata(BaseModel):
    session_id: str


class ClinicalExtraction(BaseModel):
    identified_symptoms: list[str] = Field(
        default_factory=list,
        description="Standardized clinical symptom terms mapped from the testimony.",
    )
    acog_red_flags_present: bool = Field(
        ...,
        description="True if ANY ACOG/MEWS obstetric warning sign is present in the testimony.",
    )
    specific_red_flags: list[str] = Field(
        default_factory=list,
        description="The exact ACOG red-flag identifiers that were matched.",
    )


class UrgencyAssessment(BaseModel):
    assigned_tier: UrgencyTier
    rationale: str = Field(
        ..., description="Concise clinical justification for the tier. No diagnosis."
    )


class ClinicalAssessment(BaseModel):
    """Schema 2 — quantitative parse of the testimony against ACOG terminology."""

    intake_metadata: Agent2Metadata
    clinical_extraction: ClinicalExtraction
    urgency_assessment: UrgencyAssessment


# --------------------------------------------------------------------------- #
# Schema 3 — Agent 3 (Protocol Enforcer) terminal output
# --------------------------------------------------------------------------- #
class EnforcementMetadata(BaseModel):
    session_id: str
    timestamp_utc: str = Field(default_factory=_utc_now_iso)


class EscalationDecision(BaseModel):
    status: EscalationStatus
    required_staff_action: str = Field(
        ..., description="Imperative, time-bound instruction for the charge nurse."
    )


class AuditTrail(BaseModel):
    system_rationale: str = Field(
        ...,
        description="Immutable explanation citing the ACOG/MEWS rule that forced this decision.",
    )


class EnforcementDisplay(BaseModel):
    """Presentation-ready fields the Enforcement Dashboard binds to directly.

    All values are derived deterministically by Agent 3; the UI renders them as-is.
    """

    acuity: str = Field(..., description="Short acuity label: IMMEDIATE | PRIORITY | STANDARD.")
    headline: str = Field(..., description="Banner headline, e.g. 'IMMEDIATE ESCALATION REQUIRED'.")
    status_color: str = Field(..., description="UI color band: red | amber | green.")
    triggered_flag_count: int = Field(..., description="Number of ACOG red flags that fired.")
    triggered_flag_labels: list[str] = Field(
        default_factory=list, description="Human-readable labels of the triggered red flags."
    )
    acog_citations: list[str] = Field(
        default_factory=list,
        description="Full ACOG/safety-bundle protocol reference titles for the triggered flags.",
    )
    patient_name: Optional[str] = None
    patient_id: Optional[str] = None


class EnforcementAlert(BaseModel):
    """Schema 3 — the deterministic, auditable escalation decision."""

    enforcement_metadata: EnforcementMetadata
    escalation_decision: EscalationDecision
    audit_trail: AuditTrail
    display: EnforcementDisplay


# --------------------------------------------------------------------------- #
# Pipeline envelope returned to the client
# --------------------------------------------------------------------------- #
class PipelineResult(BaseModel):
    session_id: str
    intake_payload: IntakePayload          # Schema 1
    clinical_assessment: ClinicalAssessment  # Schema 2
    enforcement_alert: EnforcementAlert      # Schema 3
