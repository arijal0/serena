import { Slider } from "@/components/ui/slider";

interface Props {
  value: number;
  onChange: (value: number) => void;
}

const LABELS: Record<number, string> = {
  1: "Barely noticeable",
  3: "Mild",
  5: "Moderate",
  7: "Severe",
  9: "Unbearable",
  10: "Worst pain ever",
};

function nearestLabel(value: number) {
  const keys = Object.keys(LABELS).map(Number).sort((a, b) => a - b);
  const closest = keys.reduce((prev, cur) =>
    Math.abs(cur - value) < Math.abs(prev - value) ? cur : prev,
  );
  return LABELS[closest];
}

export function PainSlider({ value, onChange }: Props) {
  return (
    <div className="rounded-xl border-2 border-border bg-card p-5">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <div className="text-base font-semibold text-foreground">
            How much pain are you in right now?
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {nearestLabel(value)}
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-5xl font-bold tabular-nums text-primary">
            {value}
          </span>
          <span className="text-lg font-medium text-muted-foreground">/10</span>
        </div>
      </div>
      <div className="mt-5">
        <Slider
          min={1}
          max={10}
          step={1}
          value={[value]}
          onValueChange={(v) => onChange(v[0] ?? 1)}
          aria-label="Pain level from 1 to 10"
        />
        <div className="mt-2 flex justify-between text-xs font-medium text-muted-foreground">
          <span>1 · None</span>
          <span>10 · Worst</span>
        </div>
      </div>
    </div>
  );
}
