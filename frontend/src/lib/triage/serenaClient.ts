import type { Acuity, EscalationDecision, IntakeData, PipelineProgress } from "./types";

/**
 * Serena backend client — the real HTTP seam for the three-agent pipeline.
 *
 * Streams the live pipeline via `POST /api/triage/stream` (SSE over fetch) and
 * falls back to the blocking `POST /api/triage/run` if streaming is unavailable
 * or fails before the pipeline completes. Both paths resolve a mapped
 * `EscalationDecision`; progress is reported through `onProgress`.
 */

export function getApiBase(): string {
  return import.meta.env.VITE_SERENA_API_URL ?? "http://localhost:8000";
}

// --- Backend contract (partial shapes; only what we map from) ---

interface Schema1 {
  qualitative_inputs?: {
    normalized_english_translation?: string;
  };
}

interface Schema2 {
  clinical_extraction?: {
    identified_symptoms?: string[];
    specific_red_flags?: string[];
  };
  urgency_assessment?: {
    assigned_tier?: string;
  };
}

interface Schema3Display {
  acuity?: "IMMEDIATE" | "PRIORITY" | "STANDARD";
  headline?: string;
  status_color?: string;
  triggered_flag_count?: number;
  triggered_flag_labels?: string[];
  acog_citations?: string[];
  patient_name?: string;
  patient_id?: string;
}

interface Schema3 {
  escalation_decision?: {
    status?: "STANDARD_QUEUE" | "PRIORITY_OBSERVATION" | "IMMEDIATE_ESCALATION";
    required_staff_action?: string;
  };
  audit_trail?: {
    system_rationale?: string;
  };
  enforcement_metadata?: {
    timestamp_utc?: string;
  };
  display?: Schema3Display;
}

interface PipelineResult {
  session_id?: string;
  intake_payload?: Schema1;
  clinical_assessment?: Schema2;
  enforcement_alert?: Schema3;
}

interface IntakeRequest {
  self_reported_pain_score: number;
  quick_select_flags: string[];
  raw_patient_narrative: string;
  preferred_language: "en";
  input_modality: "text";
  patient_name?: string;
  patient_id?: string;
  additional_context?: string;
}

// --- Mapping helpers ---

function toIntakeRequest(intake: IntakeData): IntakeRequest {
  return {
    self_reported_pain_score: intake.painScore,
    quick_select_flags: intake.symptoms,
    raw_patient_narrative: intake.narrative,
    preferred_language: "en",
    input_modality: "text",
    patient_name: intake.patientName || undefined,
    patient_id: intake.patientId || undefined,
    additional_context: intake.additionalInfo || undefined,
  };
}

function mapAcuity(displayAcuity: Schema3Display["acuity"]): Acuity {
  switch (displayAcuity) {
    case "IMMEDIATE":
      return "IMMEDIATE";
    case "PRIORITY":
      return "URGENT";
    case "STANDARD":
      return "ROUTINE";
    default:
      return "ROUTINE";
  }
}

function mapPipelineResult(result: PipelineResult): EscalationDecision {
  const intake = result.intake_payload ?? {};
  const clinical = result.clinical_assessment ?? {};
  const enforcement = result.enforcement_alert ?? {};
  const display = enforcement.display ?? {};
  const escalation = enforcement.escalation_decision ?? {};
  const audit = enforcement.audit_trail ?? {};

  const fallbackTime = new Date().toISOString();
  const decidedAt = enforcement.enforcement_metadata?.timestamp_utc ?? fallbackTime;

  const citations = display.acog_citations ?? [];
  const protocol = citations[0] ?? escalation.status ?? "Standard Intake";

  return {
    acuity: mapAcuity(display.acuity),
    headline: display.headline ?? "",
    requiredAction: escalation.required_staff_action ?? "",
    rationale: audit.system_rationale ?? "",
    triggeredFlags: display.triggered_flag_labels ?? [],
    acogCitations: citations,
    agentTrace: {
      listener: {
        id: "agent.listener.v1",
        completedAt: decidedAt,
        summary: intake.qualitative_inputs?.normalized_english_translation ?? "",
      },
      translator: {
        id: "agent.translator.v1",
        completedAt: decidedAt,
        clinicalFlags: clinical.clinical_extraction?.identified_symptoms ?? [],
      },
      enforcer: {
        id: "agent.enforcer.v1",
        completedAt: decidedAt,
        protocol,
      },
    },
    decidedAt,
  };
}

// --- SSE parsing ---

interface SseFrame {
  event: string;
  data: string;
}

function parseSseBlock(block: string): SseFrame | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const rawLine of block.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).replace(/^ /, ""));
    }
  }
  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join("\n") };
}

const STEP_RUNNING = "running" as const;
const STEP_DONE = "done" as const;
const STEP_PENDING = "pending" as const;

// --- Streaming path ---

async function runViaStream(
  intake: IntakeData,
  onProgress: (next: PipelineProgress) => void,
): Promise<EscalationDecision> {
  const res = await fetch(`${getApiBase()}/api/triage/stream`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "text/event-stream" },
    body: JSON.stringify(toIntakeRequest(intake)),
  });

  if (!res.ok || !res.body) {
    throw new Error(`Stream request failed with status ${res.status}`);
  }

  // step1 begins as soon as the stream is open.
  let progress: PipelineProgress = {
    step1: STEP_RUNNING,
    step2: STEP_PENDING,
    step3: STEP_PENDING,
  };
  onProgress(progress);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: PipelineResult | null = null;
  let pipelineError: string | null = null;

  const handleFrame = (frame: SseFrame) => {
    let payload: unknown = null;
    try {
      payload = frame.data ? JSON.parse(frame.data) : null;
    } catch {
      payload = null;
    }

    switch (frame.event) {
      case "agent_complete": {
        const agent = (payload as { agent?: number } | null)?.agent;
        if (agent === 1) {
          progress = { step1: STEP_DONE, step2: STEP_RUNNING, step3: STEP_PENDING };
          onProgress(progress);
        } else if (agent === 2) {
          progress = { step1: STEP_DONE, step2: STEP_DONE, step3: STEP_RUNNING };
          onProgress(progress);
        } else if (agent === 3) {
          progress = { step1: STEP_DONE, step2: STEP_DONE, step3: STEP_DONE };
          onProgress(progress);
        }
        break;
      }
      case "pipeline_complete": {
        result = payload as PipelineResult;
        break;
      }
      case "pipeline_error": {
        pipelineError = (payload as { error?: string } | null)?.error ?? "Pipeline error";
        break;
      }
      default:
        break;
    }
  };

  for (;;) {
    const { value, done } = await reader.read();
    if (value) {
      buffer += decoder.decode(value, { stream: true });
      let sepIndex: number;
      while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, sepIndex);
        buffer = buffer.slice(sepIndex + 2);
        const frame = parseSseBlock(block);
        if (frame) handleFrame(frame);
      }
    }
    if (done) break;
  }

  // Flush any trailing block without a terminating blank line.
  buffer += decoder.decode();
  if (buffer.trim().length > 0) {
    const frame = parseSseBlock(buffer);
    if (frame) handleFrame(frame);
  }

  if (pipelineError) {
    throw new Error(pipelineError);
  }
  if (!result) {
    throw new Error("Stream ended before pipeline_complete");
  }
  return mapPipelineResult(result);
}

// --- Blocking fallback path ---

async function runViaBlocking(
  intake: IntakeData,
  onProgress: (next: PipelineProgress) => void,
): Promise<EscalationDecision> {
  onProgress({ step1: STEP_RUNNING, step2: STEP_PENDING, step3: STEP_PENDING });

  const res = await fetch(`${getApiBase()}/api/triage/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(toIntakeRequest(intake)),
  });

  if (!res.ok) {
    throw new Error(`Triage request failed with status ${res.status}`);
  }

  const result = (await res.json()) as PipelineResult;

  // Synthesize step transitions since the blocking endpoint has no progress.
  onProgress({ step1: STEP_DONE, step2: STEP_DONE, step3: STEP_DONE });

  return mapPipelineResult(result);
}

export async function runTriageViaBackend(
  intake: IntakeData,
  onProgress: (next: PipelineProgress) => void,
): Promise<EscalationDecision> {
  try {
    return await runViaStream(intake, onProgress);
  } catch {
    // Streaming unavailable or interrupted — fall back to the blocking call.
    return await runViaBlocking(intake, onProgress);
  }
}
