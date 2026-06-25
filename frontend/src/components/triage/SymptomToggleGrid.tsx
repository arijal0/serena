import { Check } from "lucide-react";
import { ACOG_SYMPTOMS } from "@/lib/triage/acog-symptoms";
import { cn } from "@/lib/utils";

interface Props {
  selected: string[];
  onToggle: (id: string) => void;
}

export function SymptomToggleGrid({ selected, onToggle }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {ACOG_SYMPTOMS.map((symptom) => {
        const isSelected = selected.includes(symptom.id);
        const Icon = symptom.icon;
        return (
          <button
            key={symptom.id}
            type="button"
            onClick={() => onToggle(symptom.id)}
            aria-pressed={isSelected}
            className={cn(
              "group relative flex items-start gap-4 rounded-xl border-2 bg-card p-4 text-left transition-all",
              "hover:border-primary/50 hover:bg-surface-soft",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isSelected
                ? "border-primary bg-accent shadow-sm"
                : "border-border",
            )}
          >
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface-deep text-primary",
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <div className="flex-1 pt-0.5">
              <div className="text-base font-semibold leading-tight text-foreground">
                {symptom.label}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {symptom.description}
              </div>
            </div>
            <div
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card",
              )}
              aria-hidden
            >
              {isSelected && <Check className="h-4 w-4" strokeWidth={3} />}
            </div>
          </button>
        );
      })}
    </div>
  );
}
