import { RotateCcw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACOG_SYMPTOMS } from "@/lib/triage/acog-symptoms";
import type { EscalationDecision, IntakeData } from "@/lib/triage/types";
import { AuditTrailCard } from "./AuditTrailCard";
import { EscalationBanner } from "./EscalationBanner";

interface Props {
  intake: IntakeData;
  decision: EscalationDecision;
  onReset: () => void;
}

export function ResultView({ intake, decision, onReset }: Props) {
  const symptomLabels = ACOG_SYMPTOMS.filter((s) =>
    intake.symptoms.includes(s.id),
  ).map((s) => s.label);

  return (
    <div className="min-h-screen bg-surface-soft">
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">
                Serena · Enforcement Dashboard
              </div>
              <div className="text-xs text-muted-foreground">
                Decision issued {new Date(decision.decidedAt).toLocaleTimeString()}
              </div>
            </div>
          </div>
          <Button
            onClick={onReset}
            variant="outline"
            className="h-10 rounded-lg border-2"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset Triage
          </Button>
        </header>

        {/* Patient identity strip — for nurse to communicate & pull history */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border-2 border-primary/30 bg-card p-4">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Patient
              </div>
              <div className="text-lg font-semibold text-foreground">
                {intake.patientName || "Unnamed patient"}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Patient ID
              </div>
              <div className="font-mono text-base text-foreground">
                {intake.patientId}
              </div>
            </div>
          </div>
          {intake.additionalInfo && (
            <div className="min-w-0 flex-1 sm:max-w-md">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Additional info from patient
              </div>
              <div className="text-sm text-foreground">{intake.additionalInfo}</div>
            </div>
          )}
        </div>



        <EscalationBanner decision={decision} />

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <SummaryCard label="Pain score" value={`${intake.painScore} / 10`} accent />
          <SummaryCard
            label="Triggered flags"
            value={
              decision.triggeredFlags.length
                ? `${decision.triggeredFlags.length}`
                : "None"
            }
          />
          <SummaryCard
            label="ACOG citations"
            value={`${decision.acogCitations.length}`}
          />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <DetailCard title="Patient-reported symptoms">
            {symptomLabels.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No symptoms selected.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {symptomLabels.map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground"
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}
          </DetailCard>

          <DetailCard title="Patient narrative">
            {intake.narrative ? (
              <p className="text-sm leading-relaxed text-foreground">
                "{intake.narrative}"
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No narrative provided.
              </p>
            )}
          </DetailCard>
        </div>

        {decision.acogCitations.length > 0 && (
          <div className="mt-6">
            <DetailCard title="ACOG protocol references">
              <ul className="space-y-2">
                {decision.acogCitations.map((c) => (
                  <li
                    key={c}
                    className="text-sm leading-relaxed text-foreground"
                  >
                    · {c}
                  </li>
                ))}
              </ul>
            </DetailCard>
          </div>
        )}

        <div className="mt-6">
          <AuditTrailCard decision={decision} />
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-2 text-2xl font-bold ${accent ? "text-primary" : "text-foreground"}`}
      >
        {value}
      </div>
    </div>
  );
}

function DetailCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
