# Serena — Maternal Protocol Enforcer

> A multi-agent triage audit pipeline designed to eliminate implicit racial bias and symptom-dismissal in U.S. Emergency Departments and Obstetric Triage environments.

---

## Table of Contents

- [Overview](#overview)
- [The Problem](#the-problem)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Multi-Agent Pipeline](#multi-agent-pipeline)
- [Data Contracts (Schemas)](#data-contracts-schemas)
- [Frontend](#frontend)
- [Privacy & Engineering Constraints](#privacy--engineering-constraints)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Roadmap](#roadmap)
- [Disclaimer](#disclaimer)

---

## Overview

**Serena** (the Maternal Protocol Enforcer) is a high-density, multi-agent triage audit pipeline. It removes human subjectivity from initial obstetric intake and forces standard-of-care compliance via an unalterable digital audit trail.

A patient in obstetric distress is handed a clinical tablet at triage. They select symptoms and describe their experience in their own words. A sequence of three specialized agents listens, translates the testimony into clinical metrics, and enforces ACOG emergency guidelines — producing a deterministic escalation decision that clinical staff cannot silently dismiss.

## The Problem

- **The Disparity:** Per CDC data, Black women are **three times more likely** to die from pregnancy-related causes than White women (50.3 vs. 14.5 deaths per 100,000 live births).
- **The Root Cause:** Nearly **1 in 4** Black mothers report at least one form of mistreatment or dismissal of symptoms during maternity care. Early warning signs of hypertensive crises (e.g., severe preeclampsia) are frequently miscoded as "normal pregnancy discomfort."
- **The Preventability:** The CDC states **over 80% of pregnancy-related deaths are preventable**. Serena bridges the execution gap.

## How It Works

```
[ED / Triage Arrival] ──> Handed Clinical Tablet (React UI)
                                        │
                                        ▼
[Intake Phase] ──────────> Selects Symptoms + Types/Speaks Raw Testimony
                                        │
                                        ▼
[Agentic Handoff] ───────> Agent 1 (Listener) ──> Schema 1 ──> Agent 2 (Translator)
                                                                    │
                                                                 Schema 2
                                                                    │
                                                                    ▼
[Enforcement Phase] ─────> Host Dashboard Alert <── Schema 3 <── Agent 3 (Enforcer)
```

1. **Patient Intake Initialization** — A patient arrives at triage and is handed a tablet running the React interface.
2. **Unfiltered Capture** — The patient selects pre-configured symptom cards (to reduce typing friction under pain) and types their raw experience.
3. **Multi-Agent Execution Pipeline** — On submission, the UI shifts to the Pipeline Monitor. State is sequentially captured, translated into clinical metrics, and assessed against compliance code.
4. **Closed-Loop Verification** — The patient is validated with a confirmation that their exact testimony has been transmitted to clinical leaders.
5. **Forced Clinical Handoff** — An immutable alert fires on the Charge Nurse's tracking monitor. Because escalation status is deterministic, staff cannot bypass a case without logging an intentional override into the chart.

## Architecture

Serena uses an **Agentic State Contract** design. No single model performs intake, translation, and compliance validation simultaneously — each agent operates within strict boundaries and hands off via a versioned JSON contract. This eliminates hallucination cascade and makes every step auditable.

- **Client:** React + TypeScript, styled with Tailwind CSS and `shadcn/ui` (exported from Lovable).
- **Backend:** A three-agent pipeline orchestrating the schemas below.
- **EHR Paradigm (blueprint):** SMART on FHIR — retrieve via Epic/Cerner FHIR REST endpoints, transform in a HIPAA-compliant secure instance, and commit the audit trail back via encrypted OAuth2.

## Multi-Agent Pipeline

| Agent | Role | Objective | Output |
| --- | --- | --- | --- |
| **Agent 1** | The Intake Listener (Serena) | Empathetic advocate. Extracts direct, unfiltered patient testimony, strips dismissive framing, and preserves psychological intensity. | `Intake Payload` (Schema 1) |
| **Agent 2** | The Clinical Translator | Quantitative parser. Matches qualitative strings to standard medical terminology and flags severe obstetric metrics without diagnosing. | `Clinical Assessment` (Schema 2) |
| **Agent 3** | The Protocol Enforcer | Unyielding compliance engine. Treats Agent 2's vectors as ground truth and cross-references ACOG emergency guidelines to dictate hospital behavior. | `Enforcement Alert & Audit Trail` (Schema 3) |

## Data Contracts (Schemas)

These contracts define the handoffs between agents and the React client. Use them as the source of truth for TypeScript interfaces and Pydantic models.

### Schema 1 — Agent 1 → Agent 2

```json
{
  "intake_metadata": {
    "session_id": "string (uuid)",
    "timestamp_utc": "string (iso8601)",
    "preferred_language": "string",
    "input_modality": "text | voice_to_text"
  },
  "quantitative_inputs": {
    "self_reported_pain_score": "number (1-10)",
    "quick_select_flags": ["string"]
  },
  "qualitative_inputs": {
    "raw_patient_narrative": "string",
    "normalized_english_translation": "string"
  }
}
```

### Schema 2 — Agent 2 → Agent 3

```json
{
  "intake_metadata": {
    "session_id": "string (uuid)"
  },
  "clinical_extraction": {
    "identified_symptoms": ["string"],
    "acog_red_flags_present": "boolean",
    "specific_red_flags": ["string"]
  },
  "urgency_assessment": {
    "assigned_tier": "LOW | MEDIUM | HIGH | CRITICAL",
    "rationale": "string"
  }
}
```

### Schema 3 — Agent 3 Terminal Output

```json
{
  "enforcement_metadata": {
    "session_id": "string (uuid)",
    "timestamp_utc": "string (iso8601)"
  },
  "escalation_decision": {
    "status": "STANDARD_QUEUE | PRIORITY_OBSERVATION | IMMEDIATE_ESCALATION",
    "required_staff_action": "string"
  },
  "audit_trail": {
    "system_rationale": "string"
  }
}
```

## Frontend

The UI is built in **Lovable** as a polished React + TypeScript stack (Tailwind + `shadcn/ui`) and exported as pure functional components.

### Component Layout Map

1. **Clinical Analytics Header** — Live CDC maternal mortality metrics to ground the user before interaction.
2. **Patient Interaction Screen** — Accessible toggle cards for standard ACOG symptoms, a 1–10 pain slider, and a text area for the patient's qualitative narrative.
3. **Future Modality Hook** — A prominent Microphone component representing a future Speech-to-Text layer (Whisper / Web Speech API).
4. **Agent Pipeline Monitor** — A live execution timeline with loading spinners as data moves through Agents 1–3, expanding terminal blocks to reveal JSON payloads.
5. **Enforcement Dashboard** — A critical alert panel that flashes red or green based on Agent 3's deterministic status.

> **Integration note:** Preserve the exact Lovable UI styles and animations. Replace placeholder mockup states with active client-side orchestration / API handlers that run the backend agentic pipeline.

## Privacy & Engineering Constraints

- **Zero-Retention Local Execution:** All processing operates strictly *in-memory*. No patient data, logs, or payloads persist on client storage or local files after a session is cleared.
- **SMART on FHIR Blueprint:** In production, Serena acts as atomic middleware — retrieving from Epic/Cerner via FHIR REST, transforming in a HIPAA-compliant secure cloud instance, and committing the audit trail back via encrypted OAuth2. No patient information hits external or untrusted servers.
- **Deterministic Execution:** Every model client must be initialized with `temperature` of `0.0`–`0.1` to suppress variance and force reproducible, rule-bound behavior.

## Project Structure

```
serena/
├── README.md
├── frontend/        # Lovable-exported React + TypeScript UI
└── backend/         # Three-agent pipeline (FastAPI + Gemini 2.5 Flash)
    ├── app/
    │   ├── main.py              # FastAPI app + routes
    │   ├── config.py            # env-driven settings (model, temperature, CORS)
    │   ├── gemini_client.py     # deterministic structured-output wrapper
    │   ├── schemas.py           # Pydantic data contracts (Schema 1/2/3)
    │   ├── orchestrator.py      # sequential run + SSE streaming
    │   ├── knowledge/acog_protocols.py   # ACOG/MEWS red-flag catalog + enforcement matrix
    │   ├── prompts/             # finely tuned system instructions per agent
    │   └── agents/              # agent runners (LLM + deterministic guards)
    ├── demo.py                  # CLI demo with sample cases
    ├── requirements.txt
    └── .env.example
```

The backend is implemented and documented in [`backend/README.md`](backend/README.md).

## Getting Started

### Backend (three-agent pipeline)

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                  # then set GEMINI_API_KEY

uvicorn app.main:app --reload --port 8000             # API + docs at /docs
python demo.py --case preeclampsia                    # CLI demo for presentations
```

Key endpoints: `POST /api/triage/run` (full pipeline), `POST /api/triage/stream`
(SSE per-agent handoffs for the live monitor), `GET /api/protocols` (red-flag catalog).

### Frontend (TanStack Start + Vite)

```bash
cd frontend
bun install                                          # npm install also works
cp .env.example .env                                 # set VITE_SERENA_API_URL if not localhost:8000
bun dev                                              # or: npm run dev
```

The UI is wired to the backend through `src/lib/triage/runTriage.ts`, which calls the
live three-agent pipeline (SSE streaming via `POST /api/triage/stream`, with the blocking
`POST /api/triage/run` as a fallback). The backend base URL is read from the
`VITE_SERENA_API_URL` env var (defaults to `http://localhost:8000`), so start the backend
first, then the frontend.

## Roadmap

- [x] Implement Agent 1 (Intake Listener)
- [x] Implement Agent 2 (Clinical Translator)
- [x] Implement Agent 3 (Protocol Enforcer)
- [x] Deterministic ACOG/MEWS enforcement matrix + anti-dismissal safety net
- [x] FastAPI surface with blocking + SSE-streaming pipeline endpoints
- [ ] Wire Lovable-exported components to the live agent pipeline
- [ ] Speech-to-Text modality (Whisper / Web Speech API)
- [ ] SMART on FHIR integration layer
- [ ] Charge Nurse enforcement dashboard with override logging

## Disclaimer

Serena is a decision-support and compliance-auditing tool. It does **not** provide a medical diagnosis and is not a substitute for professional clinical judgment. All escalation decisions must be reviewed by licensed clinical staff.
