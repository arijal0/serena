"""ACOG / Maternal Early Warning Criteria (MEWS) knowledge base.

Sources distilled into machine-usable rules:
  - ACOG Practice Bulletin No. 222, "Gestational Hypertension and Preeclampsia"
  - Mhyre et al., "The Maternal Early Warning Criteria" (Obstet Gynecol 2014;124:782-6),
    National Partnership for Maternal Safety
  - CDC "Hear Her" / AWHONN Urgent Maternal Warning Signs

This module is the deterministic spine of Agent 2 (matching) and Agent 3
(enforcement). The patient on a triage tablet reports *symptoms*, not vital
signs, so the red flags below are the patient-reportable warning signs that ACOG
considers grounds for urgent bedside evaluation.

Each red flag is a single-parameter trigger: by design we favor specificity-for-
safety. A single confirmed red flag forces escalation, mirroring the MEWS
principle that one "red" trigger warrants immediate bedside evaluation. This is
the mechanism that strips human subjectivity out of triage and prevents silent
symptom-dismissal.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.schemas import EscalationStatus, UrgencyTier


# --------------------------------------------------------------------------- #
# Canonical ACOG / safety-bundle protocol references (full citation titles)
# --------------------------------------------------------------------------- #
REF_PB_222 = "ACOG Practice Bulletin 222 — Gestational Hypertension and Preeclampsia"
REF_CO_767 = (
    "ACOG Committee Opinion 767 — Emergent Therapy for Acute-Onset, "
    "Severe Hypertension During Pregnancy and the Postpartum Period"
)
REF_PB_183 = "ACOG Practice Bulletin 183 — Postpartum Hemorrhage"
REF_PB_196 = "ACOG Practice Bulletin 196 — Thromboembolism in Pregnancy"
REF_PB_229 = "ACOG Practice Bulletin 229 — Antepartum Fetal Surveillance"
REF_PB_217 = "ACOG Practice Bulletin 217 — Prelabor Rupture of Membranes"
REF_PB_234 = "ACOG Practice Bulletin 234 — Prediction and Prevention of Spontaneous Preterm Birth"
REF_PB_189 = "ACOG Practice Bulletin 189 — Nausea and Vomiting of Pregnancy"
REF_PB_212 = "ACOG Practice Bulletin 212 — Pregnancy and Heart Disease"
REF_CO_757 = "ACOG Committee Opinion 757 — Screening for Perinatal Depression"
REF_SMFM_47 = "SMFM Consult Series #47 — Sepsis During Pregnancy and the Puerperium"
REF_MEWC = "Maternal Early Warning Criteria (Mhyre et al., Obstet Gynecol 2014;124:782-6)"
REF_CDC = "CDC Hear Her / AWHONN Urgent Maternal Warning Signs"


@dataclass(frozen=True)
class RedFlag:
    id: str
    label: str
    # Lay phrases a patient might type/select; used as matching hints for the LLM
    patient_phrases: tuple[str, ...]
    # The condition this warning sign is associated with
    associated_condition: str
    tier: UrgencyTier
    # The clinical rule citation that justifies the tier
    citation: str
    aliases: tuple[str, ...] = field(default_factory=tuple)


# --------------------------------------------------------------------------- #
# ACOG / MEWS patient-reportable obstetric red flags
# --------------------------------------------------------------------------- #
RED_FLAGS: tuple[RedFlag, ...] = (
    RedFlag(
        id="severe_persistent_headache",
        label="Severe or non-remitting headache",
        patient_phrases=(
            "worst headache",
            "headache that won't go away",
            "pounding headache",
            "headache and Tylenol doesn't help",
        ),
        associated_condition="Preeclampsia with severe features / cerebral involvement",
        tier=UrgencyTier.CRITICAL,
        citation="ACOG PB 222: new-onset headache unresponsive to medication is a severe feature; MEWS neurologic trigger.",
        aliases=("severe_headache", "headache"),
    ),
    RedFlag(
        id="visual_disturbance",
        label="Vision changes (blurring, spots, flashing lights, light sensitivity)",
        patient_phrases=("blurry vision", "seeing spots", "flashing lights", "spots in my eyes"),
        associated_condition="Preeclampsia with severe features",
        tier=UrgencyTier.CRITICAL,
        citation="ACOG PB 222: visual disturbances are a severe feature of preeclampsia.",
        aliases=("vision_changes", "blurred_vision", "visual_changes"),
    ),
    RedFlag(
        id="epigastric_or_ruq_pain",
        label="Upper-abdominal / right-upper-quadrant / epigastric pain",
        patient_phrases=(
            "pain under my ribs",
            "pain in upper belly",
            "stomach pain near my chest",
            "pain on my right side under ribs",
        ),
        associated_condition="HELLP syndrome / hepatic involvement",
        tier=UrgencyTier.CRITICAL,
        citation="ACOG PB 222: severe persistent RUQ or epigastric pain is a severe feature (HELLP).",
        aliases=("epigastric_pain", "ruq_pain", "upper_abdominal_pain"),
    ),
    RedFlag(
        id="shortness_of_breath",
        label="Shortness of breath / difficulty breathing",
        patient_phrases=("can't breathe", "hard to breathe", "short of breath", "trouble breathing"),
        associated_condition="Pulmonary edema / cardiac / pulmonary embolism",
        tier=UrgencyTier.CRITICAL,
        citation="ACOG PB 222: pulmonary edema is a severe feature; MEWS respiratory/SOB trigger.",
        aliases=("difficulty_breathing", "breathing_trouble", "shortness_breath"),
    ),
    RedFlag(
        id="chest_pain",
        label="Chest pain or racing/fast-beating heart",
        patient_phrases=("chest pain", "heart racing", "fast heartbeat", "tight chest"),
        associated_condition="Cardiac event / pulmonary embolism",
        tier=UrgencyTier.CRITICAL,
        citation="CDC Urgent Maternal Warning Sign: chest pain or fast-beating heart.",
        aliases=("racing_heart", "palpitations"),
    ),
    RedFlag(
        id="seizure_or_convulsion",
        label="Seizure / convulsions / loss of consciousness",
        patient_phrases=("seizure", "convulsion", "passed out", "blacked out", "fit"),
        associated_condition="Eclampsia",
        tier=UrgencyTier.CRITICAL,
        citation="Eclampsia is an obstetric emergency; MEWS neurologic (unresponsiveness) trigger.",
        aliases=("seizure", "convulsions", "loss_of_consciousness"),
    ),
    RedFlag(
        id="vaginal_bleeding",
        label="Vaginal bleeding (heavy / soaking)",
        patient_phrases=("bleeding", "soaking pads", "heavy bleeding", "blood clots"),
        associated_condition="Placental abruption / hemorrhage / placenta previa",
        tier=UrgencyTier.CRITICAL,
        citation="MEWS hemorrhage pathway; obstetric hemorrhage is a leading cause of maternal death.",
        aliases=("heavy_bleeding", "hemorrhage", "bleeding"),
    ),
    RedFlag(
        id="decreased_fetal_movement",
        label="Decreased or absent fetal movement",
        patient_phrases=("baby not moving", "baby moving less", "no kicks", "haven't felt the baby"),
        associated_condition="Fetal compromise / hypoxia",
        tier=UrgencyTier.CRITICAL,
        citation="CDC Urgent Maternal Warning Sign: baby's movements stopping or slowing.",
        aliases=("no_fetal_movement", "reduced_fetal_movement", "decreased_movement"),
    ),
    RedFlag(
        id="suicidal_ideation",
        label="Thoughts of self-harm or harming the baby",
        patient_phrases=("want to hurt myself", "harm my baby", "don't want to live", "end it"),
        associated_condition="Perinatal mental health emergency",
        tier=UrgencyTier.CRITICAL,
        citation="CDC Urgent Maternal Warning Sign: thoughts of harming yourself or your baby.",
        aliases=("self_harm", "thoughts_of_self_harm"),
    ),
    RedFlag(
        id="severe_facial_or_hand_swelling",
        label="Sudden/severe swelling of face or hands",
        patient_phrases=("face swollen", "hands swollen", "puffy face", "rings don't fit"),
        associated_condition="Preeclampsia",
        tier=UrgencyTier.HIGH,
        citation="ACOG: rapid-onset facial/hand edema is associated with preeclampsia.",
        aliases=("facial_swelling", "severe_swelling", "swelling"),
    ),
    RedFlag(
        id="calf_swelling_or_leg_pain",
        label="Swelling, redness, or pain in one leg/arm",
        patient_phrases=("leg pain", "swollen calf", "red painful leg", "one leg bigger"),
        associated_condition="Deep vein thrombosis / venous thromboembolism",
        tier=UrgencyTier.HIGH,
        citation="CDC Urgent Maternal Warning Sign: swelling/redness/pain of leg or arm (VTE).",
        aliases=("leg_swelling", "dvt"),
    ),
    RedFlag(
        id="high_fever",
        label="Fever (>=100.4F / 38C) or signs of infection",
        patient_phrases=("fever", "chills", "burning up", "high temperature"),
        associated_condition="Sepsis / chorioamnionitis / infection",
        tier=UrgencyTier.HIGH,
        citation="CDC Urgent Maternal Warning Sign: fever; sepsis is a leading cause of maternal death.",
        aliases=("fever", "infection"),
    ),
    RedFlag(
        id="severe_abdominal_pain",
        label="Severe, constant abdominal/belly pain",
        patient_phrases=("severe belly pain", "stomach pain won't stop", "constant cramping"),
        associated_condition="Abruption / uterine rupture / appendicitis",
        tier=UrgencyTier.HIGH,
        citation="CDC Urgent Maternal Warning Sign: belly pain that doesn't go away.",
        aliases=("abdominal_pain", "belly_pain"),
    ),
    RedFlag(
        id="dizziness_or_fainting",
        label="Dizziness or fainting",
        patient_phrases=("dizzy", "lightheaded", "fainted", "about to pass out"),
        associated_condition="Hypotension / hemorrhage / cardiac",
        tier=UrgencyTier.HIGH,
        citation="CDC Urgent Maternal Warning Sign: dizziness or fainting.",
        aliases=("dizziness", "fainting"),
    ),
    RedFlag(
        id="fluid_leakage",
        label="Leaking fluid / water broke (preterm)",
        patient_phrases=("water broke", "leaking fluid", "gush of fluid", "wet underwear"),
        associated_condition="Rupture of membranes / preterm labor",
        tier=UrgencyTier.MEDIUM,
        citation="Rupture of membranes requires timely evaluation for infection/preterm labor.",
        aliases=("leaking_fluid", "water_broke"),
    ),
    RedFlag(
        id="regular_contractions",
        label="Regular/painful contractions (possible preterm labor)",
        patient_phrases=("contractions", "tightening", "cramping in waves", "labor pains"),
        associated_condition="Labor / preterm labor",
        tier=UrgencyTier.MEDIUM,
        citation="Regular contractions warrant evaluation for active or preterm labor.",
        aliases=("contractions", "preterm_labor"),
    ),
    RedFlag(
        id="severe_vomiting",
        label="Severe nausea / persistent vomiting",
        patient_phrases=("can't keep anything down", "throwing up constantly", "severe nausea"),
        associated_condition="Hyperemesis / dehydration / HELLP prodrome",
        tier=UrgencyTier.MEDIUM,
        citation="CDC Urgent Maternal Warning Sign: severe nausea and vomiting.",
        aliases=("vomiting", "nausea"),
    ),
)


# Red flag -> governing ACOG/safety protocol references (drives the dashboard's
# "ACOG PROTOCOL REFERENCES" list and the "ACOG CITATIONS" count).
PROTOCOL_REFS_BY_FLAG: dict[str, tuple[str, ...]] = {
    "severe_persistent_headache": (REF_PB_222, REF_CO_767),
    "visual_disturbance": (REF_PB_222, REF_CO_767),
    "epigastric_or_ruq_pain": (REF_PB_222,),
    "shortness_of_breath": (REF_PB_222, REF_PB_196),
    "chest_pain": (REF_PB_212, REF_PB_196),
    "seizure_or_convulsion": (REF_PB_222, REF_CO_767),
    "vaginal_bleeding": (REF_PB_183,),
    "decreased_fetal_movement": (REF_PB_229,),
    "suicidal_ideation": (REF_CO_757,),
    "severe_facial_or_hand_swelling": (REF_PB_222,),
    "calf_swelling_or_leg_pain": (REF_PB_196,),
    "high_fever": (REF_SMFM_47,),
    "severe_abdominal_pain": (REF_PB_222, REF_MEWC),
    "dizziness_or_fainting": (REF_MEWC,),
    "fluid_leakage": (REF_PB_217,),
    "regular_contractions": (REF_PB_234,),
    "severe_vomiting": (REF_PB_189,),
}


# Fast lookup tables -------------------------------------------------------- #
RED_FLAG_BY_ID: dict[str, RedFlag] = {rf.id: rf for rf in RED_FLAGS}

_ALIAS_INDEX: dict[str, RedFlag] = {}
for _rf in RED_FLAGS:
    for _key in (_rf.id, *_rf.aliases):
        _ALIAS_INDEX[_key.lower()] = _rf


# Tier → escalation status mapping (the deterministic enforcement matrix).
# CRITICAL/HIGH map to immediate escalation because any confirmed ACOG warning
# sign is grounds for urgent bedside evaluation.
TIER_TO_STATUS: dict[UrgencyTier, EscalationStatus] = {
    UrgencyTier.CRITICAL: EscalationStatus.IMMEDIATE_ESCALATION,
    UrgencyTier.HIGH: EscalationStatus.IMMEDIATE_ESCALATION,
    UrgencyTier.MEDIUM: EscalationStatus.PRIORITY_OBSERVATION,
    UrgencyTier.LOW: EscalationStatus.STANDARD_QUEUE,
}

# Required staff action templates keyed by escalation status.
STATUS_ACTION_TEMPLATE: dict[EscalationStatus, str] = {
    EscalationStatus.IMMEDIATE_ESCALATION: (
        "Immediate bedside evaluation by OB provider NOW. Obtain full vitals (BP, HR, RR, SpO2), "
        "notify charge nurse and obstetric rapid-response. Do not return patient to waiting room."
    ),
    EscalationStatus.PRIORITY_OBSERVATION: (
        "Move to monitored bed within 15 minutes. Obtain vitals and continuous observation; "
        "re-evaluate and escalate if any new red flag or vital-sign trigger appears."
    ),
    EscalationStatus.STANDARD_QUEUE: (
        "Standard triage queue. Re-screen if symptoms change. Provide maternal warning-sign "
        "education before discharge from triage."
    ),
}


# Status -> dashboard presentation (acuity label, headline, color band).
STATUS_DISPLAY: dict[EscalationStatus, dict[str, str]] = {
    EscalationStatus.IMMEDIATE_ESCALATION: {
        "acuity": "IMMEDIATE",
        "headline": "IMMEDIATE ESCALATION REQUIRED",
        "status_color": "red",
    },
    EscalationStatus.PRIORITY_OBSERVATION: {
        "acuity": "PRIORITY",
        "headline": "PRIORITY OBSERVATION",
        "status_color": "amber",
    },
    EscalationStatus.STANDARD_QUEUE: {
        "acuity": "STANDARD",
        "headline": "STANDARD TRIAGE QUEUE",
        "status_color": "green",
    },
}


def lookup_red_flag(token: str) -> RedFlag | None:
    """Resolve a quick-select flag id/alias to a canonical RedFlag, if any."""
    return _ALIAS_INDEX.get(token.strip().lower())


def protocol_references_for(flag_ids: list[str]) -> list[str]:
    """Unique, stably-ordered ACOG protocol references for the triggered flags.

    Falls back to the CDC warning-sign reference when no red flags are present
    so the dashboard always has at least one citation to show.
    """
    refs: list[str] = []
    for fid in flag_ids:
        for ref in PROTOCOL_REFS_BY_FLAG.get(fid, ()):  # preserve first-seen order
            if ref not in refs:
                refs.append(ref)
    if not refs:
        refs.append(REF_CDC)
    return refs


def knowledge_digest() -> str:
    """Human/LLM-readable digest of the red-flag catalog for system prompts."""
    lines: list[str] = []
    for rf in RED_FLAGS:
        lines.append(
            f"- id={rf.id} | tier={rf.tier.value} | {rf.label} "
            f"(condition: {rf.associated_condition}) | cite: {rf.citation}"
        )
    return "\n".join(lines)


# Severe-range vital-sign reference (used in prompts/audit text even though the
# tablet captures symptoms, not vitals — keeps Agent 3 rationale clinically anchored).
MEWS_VITAL_REFERENCE = (
    "Maternal Early Warning Criteria (single 'red' trigger => urgent bedside eval): "
    "SBP <90 or >160 mmHg; DBP >100 mmHg; HR <50 or >120; RR <10 or >30; "
    "SpO2 <95%; oliguria <35 mL/hr for >=2h; agitation/confusion/unresponsiveness; "
    "preeclampsia patient reporting non-remitting headache or shortness of breath. "
    "Severe-range BP per ACOG PB 222 = SBP >=160 or DBP >=110."
)
