"""Quick CLI demo of the Serena pipeline — useful for the live presentation.

Usage:
    python demo.py                 # runs a built-in severe-preeclampsia case
    python demo.py --case bleeding # runs another sample case
    python demo.py --list          # list available sample cases

Requires GEMINI_API_KEY in backend/.env (or the environment).
"""

from __future__ import annotations

import argparse
import json

from app.orchestrator import run_pipeline
from app.schemas import IntakeRequest

SAMPLE_CASES: dict[str, IntakeRequest] = {
    "preeclampsia": IntakeRequest(
        self_reported_pain_score=8,
        quick_select_flags=["severe_headache", "vision_changes", "epigastric_pain"],
        raw_patient_narrative=(
            "I don't want to be a bother, it's probably nothing, but I've had the "
            "worst headache for two days and Tylenol isn't touching it. I keep seeing "
            "little flashing spots and there's this pain under my right ribs."
        ),
        preferred_language="en",
        input_modality="text",
        patient_name="Jane Doe",
        patient_id="P-2026-U8Q47",
        additional_context="34 weeks pregnant, first pregnancy, no known allergies.",
    ),
    "bleeding": IntakeRequest(
        self_reported_pain_score=6,
        quick_select_flags=["heavy_bleeding"],
        raw_patient_narrative=(
            "I'm 30 weeks and I'm soaking through a pad every hour. I'm sure it's fine "
            "but there are some clots."
        ),
        preferred_language="en",
        input_modality="text",
    ),
    "fetal_movement": IntakeRequest(
        self_reported_pain_score=2,
        quick_select_flags=["no_fetal_movement"],
        raw_patient_narrative="The baby hasn't moved since last night. Maybe I'm overreacting.",
        preferred_language="en",
        input_modality="text",
    ),
    "mild": IntakeRequest(
        self_reported_pain_score=2,
        quick_select_flags=[],
        raw_patient_narrative="Some mild lower back ache and I'm a little tired today.",
        preferred_language="en",
        input_modality="text",
    ),
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Serena pipeline demo")
    parser.add_argument("--case", default="preeclampsia", help="sample case key")
    parser.add_argument("--list", action="store_true", help="list sample cases")
    args = parser.parse_args()

    if args.list:
        print("Available cases:", ", ".join(SAMPLE_CASES))
        return

    request = SAMPLE_CASES.get(args.case)
    if request is None:
        raise SystemExit(f"Unknown case '{args.case}'. Try: {', '.join(SAMPLE_CASES)}")

    print(f"\n=== Running Serena pipeline: case '{args.case}' ===\n")
    result = run_pipeline(request)

    print("── Schema 1 (Intake Listener) ──")
    print(result.intake_payload.model_dump_json(indent=2))
    print("\n── Schema 2 (Clinical Translator) ──")
    print(result.clinical_assessment.model_dump_json(indent=2))
    print("\n── Schema 3 (Protocol Enforcer) ──")
    print(result.enforcement_alert.model_dump_json(indent=2))

    decision = result.enforcement_alert.escalation_decision
    print("\n=== DECISION ===")
    print(json.dumps({"status": decision.status.value,
                      "action": decision.required_staff_action}, indent=2))


if __name__ == "__main__":
    main()
