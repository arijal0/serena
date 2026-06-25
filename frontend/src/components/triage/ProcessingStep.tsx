import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StepStatus } from "@/lib/triage/types";

interface Props {
  status: StepStatus;
  title: string;
  description: string;
  isLast?: boolean;
}

export function ProcessingStep({ status, title, description, isLast }: Props) {
  const isDone = status === "done";
  const isRunning = status === "running";

  return (
    <div className="relative flex gap-4">
      {/* Connector line */}
      {!isLast && (
        <div
          className={cn(
            "absolute left-[22px] top-12 h-[calc(100%-1rem)] w-0.5 transition-colors",
            isDone ? "bg-primary" : "bg-border",
          )}
          aria-hidden
        />
      )}

      <div
        className={cn(
          "relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition-all",
          isDone && "border-primary bg-primary text-primary-foreground",
          isRunning && "border-primary bg-card text-primary",
          status === "pending" && "border-border bg-card text-muted-foreground",
        )}
      >
        {isDone ? (
          <Check className="h-5 w-5" strokeWidth={3} />
        ) : isRunning ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <div className="h-2 w-2 rounded-full bg-current opacity-50" />
        )}
      </div>

      <div className="flex-1 pb-8 pt-1.5">
        <div
          className={cn(
            "text-base font-semibold transition-colors sm:text-lg",
            isRunning || isDone ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {title}
        </div>
        <div className="mt-1 text-sm text-muted-foreground">{description}</div>
      </div>
    </div>
  );
}
