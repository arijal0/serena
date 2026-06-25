export type WorkflowState = "idle" | "intake" | "processing" | "result";

export type StepStatus = "pending" | "running" | "done";

export interface IntakeData {
  patientId: string;
  patientName: string;
  additionalInfo: string;
  symptoms: string[];
  painScore: number;
  narrative: string;
  capturedAt: string; // ISO
}

export interface PipelineProgress {
  step1: StepStatus;
  step2: StepStatus;
  step3: StepStatus;
}

export type Acuity = "IMMEDIATE" | "URGENT" | "ROUTINE";

export interface EscalationDecision {
  acuity: Acuity;
  headline: string;
  requiredAction: string;
  rationale: string;
  triggeredFlags: string[];
  acogCitations: string[];
  agentTrace: {
    listener: { id: string; completedAt: string; summary: string };
    translator: { id: string; completedAt: string; clinicalFlags: string[] };
    enforcer: { id: string; completedAt: string; protocol: string };
  };
  decidedAt: string;
}

export type FeedbackRating = 1 | 2 | 3 | 4 | 5;
