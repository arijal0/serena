import { useState } from "react";
import { runTriage } from "@/lib/triage/runTriage";
import type {
  EscalationDecision,
  IntakeData,
  PipelineProgress,
  WorkflowState,
} from "@/lib/triage/types";
import { IntakeView } from "./IntakeView";
import { ProcessingView } from "./ProcessingView";
import { ResultView } from "./ResultView";
import { ScreensaverView } from "./ScreensaverView";

const INITIAL_PROGRESS: PipelineProgress = {
  step1: "pending",
  step2: "pending",
  step3: "pending",
};

export function TriageApp() {
  const [state, setState] = useState<WorkflowState>("idle");
  const [intake, setIntake] = useState<IntakeData | null>(null);
  const [progress, setProgress] = useState<PipelineProgress>(INITIAL_PROGRESS);
  const [decision, setDecision] = useState<EscalationDecision | null>(null);

  const handleSubmit = async (data: IntakeData) => {
    setIntake(data);
    setProgress(INITIAL_PROGRESS);
    setDecision(null);
    setState("processing");

    // SWAP POINT lives inside runTriage — see src/lib/triage/runTriage.ts
    const result = await runTriage(data, (next) => setProgress(next));
    setDecision(result);
    setState("result");
  };

  const handleReset = () => {
    setState("idle");
    setIntake(null);
    setDecision(null);
    setProgress(INITIAL_PROGRESS);
  };

  if (state === "idle") {
    return <ScreensaverView onStart={() => setState("intake")} />;
  }

  if (state === "processing") {
    return <ProcessingView progress={progress} />;
  }

  if (state === "result" && intake && decision) {
    return <ResultView intake={intake} decision={decision} onReset={handleReset} />;
  }

  return <IntakeView onSubmit={handleSubmit} />;
}

