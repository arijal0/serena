import { ChevronDown, FileCode2 } from "lucide-react";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { EscalationDecision } from "@/lib/triage/types";
import { cn } from "@/lib/utils";

interface Props {
  decision: EscalationDecision;
}

export function AuditTrailCard({ decision }: Props) {
  const [payloadOpen, setPayloadOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border bg-surface-soft px-5 py-3">
        <FileCode2 className="h-4 w-4 text-primary" />
        <div className="text-sm font-semibold text-foreground">
          Audit Trail
        </div>
        <div className="ml-auto text-xs text-muted-foreground">
          Read-only · Immutable
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Rationale
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground">
            {decision.rationale}
          </p>
        </div>

        <Collapsible open={payloadOpen} onOpenChange={setPayloadOpen}>
          <CollapsibleTrigger className="group flex w-full items-center gap-2 text-left">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors group-hover:text-foreground">
              View raw decision record
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                payloadOpen && "rotate-180",
              )}
              aria-hidden
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-surface-deep p-4 text-xs leading-relaxed text-foreground">
              <code>{JSON.stringify(decision, null, 2)}</code>
            </pre>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
