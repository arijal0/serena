import { ArrowRight, Heart, MapPin } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { FeedbackRating } from "@/lib/triage/types";
import { cn } from "@/lib/utils";

interface Props {
  onStart: () => void;
}

const HOSPITAL_NAME = "University of Mississippi Medical Center";
const HOSPITAL_ADDRESS = "2500 North State Street, Jackson, MS";

const ACCENT = "#E8637A";
const CTA = "#C96070";
const BG = "#FFF5F5";
const INK = "#3D2A2E";
const SUB = "#7A6A6A";

const RATINGS: { value: FeedbackRating; emoji: string; label: string }[] = [
  { value: 1, emoji: "😞", label: "Awful" },
  { value: 2, emoji: "🙁", label: "Poor" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😍", label: "Amazing" },
];

const sans = { fontFamily: "'DM Sans', ui-sans-serif, system-ui, sans-serif" };
const serif = { fontFamily: "'DM Serif Display', ui-serif, Georgia, serif" };

export function ScreensaverView({ onStart }: Props) {
  const [submittedRating, setSubmittedRating] = useState<FeedbackRating | null>(null);
  const [comment, setComment] = useState("");
  const [thanked, setThanked] = useState(false);

  return (
    <div
      className="flex h-screen flex-col overflow-hidden"
      style={{ backgroundColor: BG, color: INK, ...sans }}
    >
      {/* Header */}
      <header className="border-b" style={{ borderColor: "rgba(232,99,122,0.14)" }}>
        <div className="mx-auto flex w-full max-w-5xl items-baseline gap-x-4 gap-y-1 px-8 py-5 flex-wrap">
          <span style={{ ...serif, fontSize: 22, color: ACCENT, letterSpacing: "-0.01em" }}>
            Serena
          </span>
          <span className="h-4 w-px" style={{ backgroundColor: "rgba(122,106,106,0.3)" }} />
          <span style={{ fontSize: 14, color: INK }}>{HOSPITAL_NAME}</span>
          <span className="inline-flex items-center gap-1" style={{ fontSize: 13, color: SUB }}>
            <MapPin className="h-3 w-3" aria-hidden style={{ color: SUB }} />
            {HOSPITAL_ADDRESS}
          </span>
        </div>
      </header>

      {/* Body */}
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-8 py-10">
        {/* Hero — left aligned */}
        <section className="flex flex-1 flex-col items-center justify-center text-center">
          {/* Pulsing heart */}
          <div className="relative mb-10 flex h-20 w-20 items-center justify-center">
            <span
              className="absolute inset-0 rounded-full [animation:ping_2.4s_cubic-bezier(0,0,0.2,1)_infinite]"
              style={{ backgroundColor: "rgba(232,99,122,0.18)" }}
            />
            <span
              className="absolute inset-2 rounded-full [animation:ping_2.4s_cubic-bezier(0,0,0.2,1)_infinite_300ms]"
              style={{ backgroundColor: "rgba(232,99,122,0.26)" }}
            />
            <span
              className="relative flex h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: ACCENT, boxShadow: "0 10px 30px -12px rgba(232,99,122,0.55)" }}
            >
              <Heart
                className="h-6 w-6 fill-current"
                aria-hidden
                style={{ color: "white", animation: "pulse 1.4s ease-in-out infinite" }}
              />
            </span>
          </div>

          <h1
            style={{
              ...serif,
              fontWeight: 400,
              fontStyle: "italic",
              fontSize: 38,
              lineHeight: 1.1,
              color: INK,
              letterSpacing: "-0.01em",
            }}
          >
            Welcome, mama.
          </h1>
          <p
            className="mx-auto mt-5 max-w-md"
            style={{ fontSize: 15, lineHeight: 1.5, color: SUB }}
          >
            Tap below to tell us how you're feeling. Your words go straight to the care
            team — no waiting in line to be heard.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3">
            <Button
              onClick={onStart}
              className="group h-14 rounded-full px-7 text-base font-medium text-white shadow-lg transition-all hover:scale-[1.02]"
              style={{
                backgroundColor: CTA,
                boxShadow: "0 12px 28px -14px rgba(201,96,112,0.6)",
                ...sans,
              }}
            >
              Start my check-in
              <ArrowRight className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
            <p style={{ fontSize: 13, color: SUB }}>
              Your words go directly to your care team.
            </p>
          </div>

        </section>

        {/* Feedback */}
        <section
          className="mt-10 w-full rounded-2xl border p-6"
          style={{
            borderColor: "rgba(232,99,122,0.18)",
            backgroundColor: "rgba(255,255,255,0.6)",
          }}
        >
          {thanked ? (
            <div className="flex flex-col py-2 [animation:fade-in_0.4s_ease-out]">
              <span className="text-4xl">
                {RATINGS.find((r) => r.value === submittedRating)?.emoji}
              </span>
              <h2 className="mt-2" style={{ ...serif, fontSize: 22, color: INK }}>
                Thank you for your feedback.
              </h2>
              <p className="mt-1" style={{ fontSize: 14, color: SUB }}>
                We'll share this with the team right away.
              </p>
            </div>
          ) : (
            <>
              <div>
                <h2 style={{ ...serif, fontStyle: "italic", fontSize: 22, color: INK }}>
                  How are we doing?
                </h2>
                <p className="mt-1" style={{ fontSize: 13, color: SUB }}>
                  Your feedback helps us care for you better.
                </p>
              </div>
              <div className="mt-5 grid grid-cols-5 gap-2 sm:gap-3">
                {RATINGS.map((r) => {
                  const selected = submittedRating === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setSubmittedRating(r.value)}
                      aria-label={`Rate ${r.label}`}
                      aria-pressed={selected}
                      className={cn(
                        "group flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all",
                        "hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2",
                      )}
                      style={{
                        borderColor: selected ? ACCENT : "rgba(232,99,122,0.15)",
                        backgroundColor: selected ? "rgba(232,99,122,0.08)" : "white",
                      }}
                    >
                      <span
                        className={cn(
                          "text-3xl transition-transform sm:text-4xl",
                          selected ? "scale-125" : "group-hover:scale-125",
                        )}
                      >
                        {r.emoji}
                      </span>
                      <span style={{ fontSize: 12, color: selected ? INK : SUB }}>
                        {r.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {submittedRating !== null && (
                <div className="mt-5 [animation:fade-in_0.3s_ease-out]">
                  <label
                    htmlFor="feedback-comment"
                    style={{ fontSize: 12, color: SUB }}
                  >
                    Want to tell us more?{" "}
                    <span style={{ color: "rgba(122,106,106,0.7)" }}>(optional)</span>
                  </label>
                  <Textarea
                    id="feedback-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="What stood out — good or bad?"
                    className="mt-2 min-h-20 resize-none rounded-xl border bg-white p-3 text-sm shadow-none focus-visible:ring-2"
                    style={{ borderColor: "rgba(232,99,122,0.2)" }}
                  />
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setComment("");
                        setThanked(true);
                      }}
                      style={{ color: SUB }}
                    >
                      Skip
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setThanked(true)}
                      className="text-white hover:opacity-90"
                      style={{ backgroundColor: CTA }}
                    >
                      Send feedback
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
