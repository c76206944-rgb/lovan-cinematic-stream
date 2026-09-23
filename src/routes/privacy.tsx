import { createFileRoute } from "@tanstack/react-router";
import { Prose } from "@/components/site/Prose";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy | LOVAN" },
      { name: "description", content: "How LOVAN handles your data." },
      { property: "og:title", content: "Privacy | LOVAN" },
      { property: "og:description", content: "How LOVAN handles your data." },
    ],
  }),
  component: () => (
    <Prose
      title="Privacy"
      description="What we collect, why we collect it and what you can ask us to do with it."
      sections={[
        {
          heading: "What we collect",
          body: "Account details, viewing history used for resume and recommendations, device and playback diagnostics.",
        },
        {
          heading: "Why we collect it",
          body: "To deliver playback, remember where you stopped, show what is available in your territory and keep the service secure.",
        },
        {
          heading: "Recommendations",
          body: "When you describe what you want to watch, that description is sent to an AI service to match it against the LOVAN catalogue. It is not used to identify you.",
        },
        {
          heading: "Your choices",
          body: "You can request a copy of your data, correct it or ask for deletion of your account and viewing history.",
        },
      ]}
    />
  ),
});
