import { useState } from "react";
import { RotateCcw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [error, setError] = useState<string | null>(null);

  const runPipeline = async (data: IntakeData) => {
    setIntake(data);
    setProgress(INITIAL_PROGRESS);
    setDecision(null);
    setError(null);
    setState("processing");

    try {
      // SWAP POINT lives inside runTriage — see src/lib/triage/runTriage.ts
      const result = await runTriage(data, (next) => setProgress(next));
      setDecision(result);
      setState("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  };

  const handleSubmit = (data: IntakeData) => {
    void runPipeline(data);
  };

  const handleReset = () => {
    setState("idle");
    setIntake(null);
    setDecision(null);
    setProgress(INITIAL_PROGRESS);
    setError(null);
  };

  if (state === "idle") {
    return <ScreensaverView onStart={() => setState("intake")} />;
  }

  if (state === "processing" && error) {
    return (
      <PipelineErrorView
        message={error}
        onRetry={intake ? () => void runPipeline(intake) : undefined}
        onReset={handleReset}
      />
    );
  }

  if (state === "processing") {
    return <ProcessingView progress={progress} />;
  }

  if (state === "result" && intake && decision) {
    return <ResultView intake={intake} decision={decision} onReset={handleReset} />;
  }

  return <IntakeView onSubmit={handleSubmit} />;
}

function PipelineErrorView({
  message,
  onRetry,
  onReset,
}: {
  message: string;
  onRetry?: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-soft px-5 py-10">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <WifiOff className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground">
          We couldn't reach the care system
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your check-in was not sent. Please ask a staff member for help, or try again.
        </p>
        <p className="mt-4 break-words rounded-lg bg-surface-deep p-3 text-xs text-muted-foreground">
          {message}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {onRetry && (
            <Button onClick={onRetry} className="h-11 rounded-lg">
              <RotateCcw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          )}
          <Button onClick={onReset} variant="outline" className="h-11 rounded-lg border-2">
            Start over
          </Button>
        </div>
      </div>
    </div>
  );
}

