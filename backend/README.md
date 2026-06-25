# Serena Backend — Three-Agent Obstetric Triage Pipeline

The agentic engine behind **Serena (Maternal Protocol Enforcer)**. It turns a
patient's tablet intake into a deterministic, auditable escalation decision using
three specialized Gemini 2.5 Flash agents chained through versioned JSON contracts.

```
IntakeRequest ─▶ Agent 1 (Listener) ─▶ Schema 1
                                       └▶ Agent 2 (Translator) ─▶ Schema 2
                                                                  └▶ Agent 3 (Enforcer) ─▶ Schema 3
```

## Why three agents?

No single model performs intake, clinical translation, and compliance at once.
Each agent has a narrow mandate and hands off via a typed contract — this prevents
hallucination cascade and makes **every step auditable**. Crucially, the design is
built to defeat *symptom dismissal*, the documented root cause behind the 3× higher
maternal mortality for Black women.

| Agent | Role | Guards against | Output |
| --- | --- | --- | --- |
| **1 — Intake Listener (Serena)** | Empathetic advocate. Preserves verbatim testimony, strips self-minimizing hedges, keeps intensity. Never diagnoses. | Losing urgency to "it's probably nothing, but…" framing | Schema 1 |
| **2 — Clinical Translator** | Maps lay testimony → standardized symptoms + ACOG/MEWS red flags, assigns urgency tier. Never diagnoses. | Missing a known red flag; under-rating severity | Schema 2 |
| **3 — Protocol Enforcer** | Converts the assessment into an enforced escalation status + immutable, ACOG-cited audit rationale. | Silent downgrade / clinician discretion to "wait and see" | Schema 3 |

## Determinism & safety guarantees

This is a compliance tool, so behavior is reproducible by construction:

- **Temperature `0.0`, top_p `0.1`, fixed seed** on every model call.
- **Machine-owned fields are pinned in code, not trusted to the LLM**: the verbatim
  narrative, session metadata, pain score, and the final escalation *status* are all
  computed deterministically.
- **Anti-dismissal safety net (Agent 2):** every quick-select flag is resolved
  against the ACOG catalog, and the assigned tier is *floored* to the most severe
  matched red flag — it can be raised, never lowered.
- **Deterministic enforcement matrix (Agent 3):**
  `CRITICAL/HIGH → IMMEDIATE_ESCALATION`, `MEDIUM → PRIORITY_OBSERVATION`,
  `LOW → STANDARD_QUEUE`. If any CRITICAL-catalog red flag is present, the status is
  forced to `IMMEDIATE_ESCALATION` regardless of upstream tier.

## Clinical grounding

The red-flag catalog (`app/knowledge/acog_protocols.py`) distills:

- **ACOG Practice Bulletin No. 222** — Gestational Hypertension and Preeclampsia
  (severe features: severe-range BP, RUQ/epigastric pain, visual disturbance,
  non-remitting headache, pulmonary edema).
- **Maternal Early Warning Criteria** (Mhyre et al., *Obstet Gynecol* 2014) —
  single-parameter triggers for urgent bedside evaluation.
- **CDC "Hear Her" / AWHONN Urgent Maternal Warning Signs.**

> Decision-support only — not a diagnosis. All escalations are reviewed by licensed staff.

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# edit .env and set GEMINI_API_KEY  (get one: https://aistudio.google.com/apikey)
```

## Run

```bash
# API server (http://localhost:8000, interactive docs at /docs)
uvicorn app.main:app --reload --port 8000

# CLI demo (great for the live presentation)
python demo.py --list
python demo.py --case preeclampsia
```

## API

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Liveness + whether the API key is configured |
| `GET` | `/api/protocols` | ACOG red-flag catalog (drives the UI symptom cards/legend) |
| `POST` | `/api/triage/run` | Run the full pipeline; returns all three schemas |
| `POST` | `/api/triage/stream` | Run the pipeline and stream each handoff as SSE |

### Request body (`IntakeRequest`)

```json
{
  "self_reported_pain_score": 8,
  "quick_select_flags": ["severe_headache", "vision_changes", "epigastric_pain"],
  "raw_patient_narrative": "Worst headache for two days, Tylenol isn't helping, seeing flashing spots, pain under my right ribs.",
  "preferred_language": "en",
  "input_modality": "text",
  "patient_name": "Jane Doe",
  "patient_id": "P-2026-U8Q47",
  "additional_context": "34 weeks pregnant, penicillin allergy"
}
```

`patient_name`, `patient_id`, and `additional_context` are optional. `input_modality`
is `"text"` by default (the mic is a future-feature placeholder).

### Schema 3 `display` block (dashboard-ready)

Agent 3 emits a deterministic `display` object so the Enforcement Dashboard binds
with zero client-side logic:

```json
"display": {
  "acuity": "IMMEDIATE",
  "headline": "IMMEDIATE ESCALATION REQUIRED",
  "status_color": "red",
  "triggered_flag_count": 1,
  "triggered_flag_labels": ["Severe or non-remitting headache"],
  "acog_citations": [
    "ACOG Practice Bulletin 222 — Gestational Hypertension and Preeclampsia",
    "ACOG Committee Opinion 767 — Emergent Therapy for Acute-Onset, Severe Hypertension During Pregnancy and the Postpartum Period"
  ],
  "patient_name": "Jane Doe",
  "patient_id": "P-2026-U8Q47"
}
```

`status_color` is `red` (IMMEDIATE), `amber` (PRIORITY), or `green` (STANDARD).

### Streaming events (`/api/triage/stream`)

SSE frames the React **Agent Pipeline Monitor** can render live:

```
event: pipeline_start     data: { "session_id": "..." }
event: agent_start        data: { "agent": 1, "name": "Intake Listener" }
event: agent_complete     data: { "agent": 1, "schema": 1, "payload": { ...Schema 1... } }
event: agent_start        data: { "agent": 2, ... }
event: agent_complete     data: { "agent": 2, "schema": 2, "payload": { ...Schema 2... } }
event: agent_start        data: { "agent": 3, ... }
event: agent_complete     data: { "agent": 3, "schema": 3, "payload": { ...Schema 3... } }
event: pipeline_complete  data: { ...PipelineResult... }
```

### Frontend (Lovable) wiring example

```ts
const res = await fetch("http://localhost:8000/api/triage/run", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    self_reported_pain_score: pain,
    quick_select_flags: selectedFlags,   // ids from GET /api/protocols
    raw_patient_narrative: narrative,
    preferred_language: "en",
    input_modality: "text",
  }),
});
const result = await res.json();
// result.intake_payload / result.clinical_assessment / result.enforcement_alert
```

For the live pipeline animation, consume `/api/triage/stream` with `EventSource`
or a fetch reader and reveal each agent block as its `agent_complete` frame arrives.

## Project layout

```
backend/
├── app/
│   ├── main.py                  # FastAPI app + routes
│   ├── config.py                # env-driven settings (model, temperature, CORS)
│   ├── gemini_client.py         # deterministic structured-output wrapper
│   ├── schemas.py               # Pydantic data contracts (Schema 1/2/3)
│   ├── orchestrator.py          # sequential run + SSE streaming
│   ├── knowledge/
│   │   └── acog_protocols.py    # ACOG/MEWS red-flag catalog + enforcement matrix
│   ├── prompts/                 # finely tuned system instructions per agent
│   │   ├── agent1_listener.py
│   │   ├── agent2_translator.py
│   │   └── agent3_enforcer.py
│   └── agents/                  # agent runners (LLM + deterministic guards)
│       ├── agent1_listener.py
│       ├── agent2_translator.py
│       └── agent3_enforcer.py
├── demo.py                      # CLI demo with sample cases
├── requirements.txt
└── .env.example
```
