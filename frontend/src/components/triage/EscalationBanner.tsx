import { AlertOctagon } from "lucide-react";
import type { EscalationDecision } from "@/lib/triage/types";
import { cn } from "@/lib/utils";

interface Props {
  decision: EscalationDecision;
}

export function EscalationBanner({ decision }: Props) {
  const isCritical = decision.acuity === "IMMEDIATE";

  return (
    <div
      role="alert"
      className={cn(
        "rounded-2xl border-2 p-6 sm:p-8",
        isCritical
          ? "border-critical-border bg-critical"
          : "border-border bg-card",
      )}
    >
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          {isCritical && (
            <span
              aria-hidden
              className="absolute inset-0 animate-ping rounded-full bg-critical-border/40"
            />
          )}
          <div
            className={cn(
              "relative flex h-14 w-14 items-center justify-center rounded-full",
              isCritical
                ? "bg-critical-border text-primary-foreground"
                : "bg-surface-deep text-primary",
            )}
          >
            <AlertOctagon className="h-7 w-7" />
          </div>
        </div>

        <div className="flex-1">
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider",
              isCritical
                ? "bg-critical-border text-primary-foreground"
                : "bg-surface-deep text-foreground",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isCritical ? "animate-pulse bg-primary-foreground" : "bg-foreground",
              )}
            />
            Acuity · {decision.acuity}
          </div>

          <h2
            className={cn(
              "mt-3 text-2xl font-bold leading-tight tracking-tight sm:text-3xl",
              isCritical ? "text-critical-foreground" : "text-foreground",
            )}
          >
            {decision.headline}
          </h2>

          <p
            className={cn(
              "mt-3 text-base leading-relaxed sm:text-lg",
              isCritical ? "text-critical-foreground/90" : "text-muted-foreground",
            )}
          >
            {decision.requiredAction}
          </p>
        </div>
      </div>
    </div>
  );
}
