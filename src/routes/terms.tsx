import { createFileRoute } from "@tanstack/react-router";
import { Prose } from "@/components/site/Prose";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms | LOVAN" },
      { name: "description", content: "The terms that apply when you use LOVAN." },
      { property: "og:title", content: "Terms | LOVAN" },
      { property: "og:description", content: "The terms that apply when you use LOVAN." },
    ],
  }),
  component: () => (
    <Prose
      title="Terms of Use"
      description="A plain summary of the rules for using LOVAN. This demo text is not legal advice."
      sections={[
        {
          heading: "Your account",
          body: "You are responsible for activity on your account and for keeping your sign-in details private.",
        },
        {
          heading: "Content and rights",
          body: "All titles are licensed from filmmakers, producers, distributors and authorized rights holders. Availability depends on the rights held for each territory.",
        },
        {
          heading: "Ownership disclaimer",
          body: "LOVAN does not own the films and series on the service. They come from different sources, and all rights remain with their respective owners. Owners can ask for a title to be taken down through the Request removal page.",
        },
        {
          heading: "Permitted use",
          body: "Streaming is for personal, non-commercial viewing. Recording, redistributing or circumventing access controls is not allowed.",
        },
        {
          heading: "Plans and payment",
          body: "Prices are set per country and currency. Premium renews until cancelled and can be cancelled at any time.",
        },
        {
          heading: "Changes",
          body: "These terms may be updated. Material changes will be announced in the app before they take effect.",
        },
      ]}
    />
  ),
});
