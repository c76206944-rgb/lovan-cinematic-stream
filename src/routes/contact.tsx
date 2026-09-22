import { createFileRoute } from "@tanstack/react-router";
import { Prose } from "@/components/site/Prose";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact | LOVAN" },
      { name: "description", content: "Reach the LOVAN team about viewing, licensing or press." },
      { property: "og:title", content: "Contact | LOVAN" },
      { property: "og:description", content: "Reach the LOVAN team." },
    ],
  }),
  component: () => (
    <Prose
      title="Contact"
      description="Tell us what you need and we will route it to the right team."
      sections={[
        {
          heading: "Viewers",
          body: "For playback, billing or account questions, start with the Help page. If it does not cover your case, write to support and include the title and the time of the problem.",
        },
        {
          heading: "Filmmakers and rights holders",
          body: "For submissions, licensing and territory questions, see the Creator Hub and write to the licensing team.",
        },
        {
          heading: "Press",
          body: "For interviews, assets and announcements, write to the press team.",
        },
        {
          heading: "Addresses",
          body: "Contact addresses have not been supplied yet. Send us the real support, licensing and press addresses and we will put them on this page.",
        },
      ]}
    />
  ),
});
