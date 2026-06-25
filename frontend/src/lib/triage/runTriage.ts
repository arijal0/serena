import { runTriageViaBackend } from "./serenaClient";
import type { EscalationDecision, IntakeData, PipelineProgress } from "./types";

/**
 * Backend integration seam.
 *
 * Delegates to the Serena three-agent pipeline over HTTP (SSE streaming with a
 * blocking fallback). The exported signature is intentionally stable so
 * `TriageApp`, `ProcessingView`, and `ResultView` remain untouched.
 *
 * The PipelineProgress shape (step1/step2/step3) maps 1:1 to:
 *   step1 → Agent 1 (Listener)
 *   step2 → Agent 2 (Translator)
 *   step3 → Agent 3 (Enforcer)
 * Patient-facing copy intentionally hides the agent names.
 */
export function runTriage(
  intake: IntakeData,
  onProgress: (next: PipelineProgress) => void,
): Promise<EscalationDecision> {
  return runTriageViaBackend(intake, onProgress);
}
