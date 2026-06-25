import { ChevronDown, MapPin, Mic, Send, Stethoscope } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { ACOG_SYMPTOMS } from "@/lib/triage/acog-symptoms";
import type { IntakeData } from "@/lib/triage/types";
import { cn } from "@/lib/utils";
import { PainSlider } from "./PainSlider";
import { SymptomToggleGrid } from "./SymptomToggleGrid";

interface Props {
  onSubmit: (intake: IntakeData) => void;
}

const HOSPITAL_NAME = "University of Mississippi Medical Center";
const HOSPITAL_ADDRESS = "2500 North State Street, Jackson, MS";

export function IntakeView({ onSubmit }: Props) {
  const [patientName, setPatientName] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [painScore, setPainScore] = useState(3);
  const [narrative, setNarrative] = useState("");
  const [symptomsOpen, setSymptomsOpen] = useState(false);

  const patientId = useMemo(
    () =>
      `P-${new Date().getFullYear()}-${Math.random()
        .toString(36)
        .slice(2, 7)
        .toUpperCase()}`,
    [],
  );

  const toggleSymptom = (id: string) =>
    setSymptoms((cur) =>
      cur.includes(id) ? cur.filter((s) => s !== id) : [...cur, id],
    );

  const canSubmit =
    patientName.trim().length > 0 &&
    (symptoms.length > 0 || narrative.trim().length > 0);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      patientId,
      patientName: patientName.trim(),
      additionalInfo: additionalInfo.trim(),
      symptoms,
      painScore,
      narrative: narrative.trim(),
      capturedAt: new Date().toISOString(),
    });
  };

  const selectedLabels = ACOG_SYMPTOMS.filter((s) => symptoms.includes(s.id))
    .map((s) => s.label);

  return (
    <div className="flex h-screen flex-col bg-surface-soft">
      {/* Top header */}
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-5 py-3 sm:px-8">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Stethoscope className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <span className="text-lg leading-tight tracking-tight text-foreground">
                Serena
              </span>
              <span className="text-sm text-foreground/80">
                {HOSPITAL_NAME}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" aria-hidden />
                {HOSPITAL_ADDRESS}
              </span>
            </div>
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
              A guided check-in tablet that helps the care team understand how
              you're feeling before they see you.
            </p>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 overflow-y-auto px-5 py-4 sm:px-8">
        <div className="text-center">
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Tell us what you're feeling — your words go straight to the care team.
          </h1>
        </div>

        {/* Patient identity */}
        <div className="grid gap-3 rounded-xl border-2 border-border bg-card p-4 sm:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="patient-name" className="text-sm font-semibold text-foreground">
              Your name
            </label>
            <Input
              id="patient-name"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="First and last name"
              maxLength={120}
              className="h-11 rounded-lg border-2 text-base"
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:items-end">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Patient ID
            </span>
            <span className="rounded-md bg-surface-soft px-3 py-2 font-mono text-sm text-foreground">
              {patientId}
            </span>
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="extra-info" className="text-sm font-semibold text-foreground">
              Anything else the team should know?{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="extra-info"
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="Allergies, weeks pregnant, medications, prior provider…"
              maxLength={500}
              className="h-11 rounded-lg border-2 text-base"
            />
          </div>
        </div>


        {/* Symptoms collapsible */}
        <Collapsible open={symptomsOpen} onOpenChange={setSymptomsOpen}>
          <CollapsibleTrigger
            className={cn(
              "group flex w-full items-center gap-3 rounded-xl border-2 border-border bg-card px-4 py-3 text-left transition-colors",
              "hover:border-primary/40",
            )}
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              1
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold text-foreground">
                Which of these are you feeling?
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {symptoms.length === 0
                  ? "Tap to see the list — pick any that apply"
                  : `${symptoms.length} selected · ${selectedLabels.join(", ")}`}
              </div>
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                symptomsOpen && "rotate-180",
              )}
              aria-hidden
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="pt-3">
              <SymptomToggleGrid selected={symptoms} onToggle={toggleSymptom} />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Pain slider — compact */}
        <PainSlider value={painScore} onChange={setPainScore} />

        {/* Narrative — flex-1 to fill remaining space */}
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="mb-1.5 flex items-baseline justify-between">
            <label
              htmlFor="narrative"
              className="text-sm font-semibold text-foreground"
            >
              Tell us in your own words
            </label>
            <span className="text-xs text-muted-foreground">
              Anything that doesn't feel right
            </span>
          </div>
          <div className="relative min-h-0 flex-1">
            <Textarea
              id="narrative"
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder="Describe what you are feeling…"
              className="h-full min-h-24 resize-none rounded-xl border-2 bg-card p-4 pr-14 text-base leading-relaxed shadow-none focus-visible:ring-2"
            />
            <button
              type="button"
              disabled
              title="Voice input coming soon"
              aria-label="Voice input (coming soon)"
              className="absolute right-3 top-3 inline-flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-full bg-surface-deep text-muted-foreground opacity-70"
            >
              <Mic className="h-5 w-5" />
            </button>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          size="lg"
          className="h-12 w-full shrink-0 rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <Send className="mr-2 h-5 w-5" />
          Submit Triage Assessment
        </Button>
      </div>
    </div>
  );
}
