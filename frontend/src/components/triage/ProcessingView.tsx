import { Heart } from "lucide-react";
import type { PipelineProgress } from "@/lib/triage/types";
import { ProcessingStep } from "./ProcessingStep";

interface Props {
  progress: PipelineProgress;
}

export function ProcessingView({ progress }: Props) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-soft px-5 py-10">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-10">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-primary">
            <Heart className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            We've received your information.
          </h1>
          <p className="mt-2 max-w-sm text-base text-muted-foreground">
            A nurse is being notified. Please keep the tablet with you — this
            only takes a moment.
          </p>
        </div>

        <div className="mt-10">
          <ProcessingStep
            status={progress.step1}
            title="Recording what you told us"
            description="Saving your symptoms and your words exactly as you shared them."
          />
          <ProcessingStep
            status={progress.step2}
            title="Reviewing your symptoms"
            description="Looking for anything that needs urgent attention."
          />
          <ProcessingStep
            status={progress.step3}
            title="Notifying your care team"
            description="Sending a summary to the nurse and on-call provider."
            isLast
          />
        </div>
      </div>
    </div>
  );
}
