import { createFileRoute } from "@tanstack/react-router";
import { Prose } from "@/components/site/Prose";

export const Route = createFileRoute("/cookie-policy")({
  head: () => ({
    meta: [
      { title: "Cookie Policy | LOVAN" },
      { name: "description", content: "How LOVAN uses cookies and similar technologies." },
      { property: "og:title", content: "Cookie Policy | LOVAN" },
      { property: "og:description", content: "How LOVAN uses cookies." },
    ],
  }),
  component: () => (
    <Prose
      title="Cookie Policy"
      description="Cookies keep you signed in, remember your preferences and help us measure playback quality."
      sections={[
        {
          heading: "Essential",
          body: "Needed to sign you in, keep your session and protect the service. These cannot be switched off.",
        },
        {
          heading: "Preferences",
          body: "Remember your language, subtitle and quality choices between visits.",
        },
        {
          heading: "Measurement",
          body: "Help us understand playback failures and which parts of the catalogue are used.",
        },
        {
          heading: "Advertising",
          body: "Used to control how often advertising is shown.",
        },
      ]}
    />
  ),
});
