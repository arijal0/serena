import { createFileRoute } from "@tanstack/react-router";
import { TriageApp } from "@/components/triage/TriageApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Serena Triage Assistant" },
      {
        name: "description",
        content:
          "Serena — maternal triage protocol enforcer. Empathetic patient intake that escalates obstetric red flags to clinical staff.",
      },
      { property: "og:title", content: "Serena Triage Assistant" },
      {
        property: "og:description",
        content:
          "Empathetic patient intake that escalates obstetric red flags to clinical staff.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return <TriageApp />;
}
