import { createFileRoute } from "@tanstack/react-router";
import { Prose } from "@/components/site/Prose";

export const Route = createFileRoute("/creator-hub")({
  head: () => ({
    meta: [
      { title: "Creator Hub | LOVAN" },
      {
        name: "description",
        content:
          "For filmmakers, producers, distributors and rights holders who want to bring work to LOVAN.",
      },
      { property: "og:title", content: "Creator Hub | LOVAN" },
      {
        property: "og:description",
        content: "Bring your films and series to a worldwide audience on LOVAN.",
      },
    ],
  }),
  component: () => (
    <Prose
      title="Creator Hub"
      description="LOVAN works with filmmakers, producers, distributors, studios and authorized rights holders."
      sections={[
        {
          heading: "Who can submit",
          body: "Anyone who holds or represents the rights to a film, series, documentary or short film. You keep your rights; LOVAN licenses the right to stream in the territories you agree to.",
        },
        {
          heading: "What we ask for",
          body: "A master file, artwork, subtitle and audio tracks where available, and clear documentation of the rights you hold for each territory.",
        },
        {
          heading: "Territories",
          body: "Countries are metadata only. A title is shown where the rights are held for it, and nowhere else.",
        },
        {
          heading: "Next steps",
          body: "The full submission and licensing workflow is being prepared. Contact us in the meantime and we will get back to you.",
        },
      ]}
    />
  ),
});
