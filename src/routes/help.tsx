import { createFileRoute } from "@tanstack/react-router";
import { Prose } from "@/components/site/Prose";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help | LOVAN" },
      { name: "description", content: "Answers about playback, plans, devices and availability on LOVAN." },
      { property: "og:title", content: "Help | LOVAN" },
      { property: "og:description", content: "Answers about playback, plans and availability." },
    ],
  }),
  component: () => (
    <Prose
      title="Help"
      description="Common questions about watching on LOVAN."
      sections={[
        {
          heading: "Why is a title missing for me?",
          body: "Every title is licensed for specific territories. If the rights are not held where you are, the title is not shown.",
        },
        {
          heading: "Is LOVAN free?",
          body: "Yes. The free tier includes up to five advertising placements per session. Premium removes advertising.",
        },
        {
          heading: "Which devices work?",
          body: "Any modern browser. Premium allows up to four devices on one account.",
        },
        {
          heading: "Can I watch offline?",
          body: "Offline viewing is available on Premium where the territory rights and your plan allow it.",
        },
        {
          heading: "Playback problems",
          body: "Check your connection, reload the page, and lower the quality setting if the picture keeps pausing. If it continues, contact us with the title name and the time it happened.",
        },
      ]}
    />
  ),
});
