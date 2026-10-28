import { createFileRoute } from "@tanstack/react-router";
import { DownloadsView } from "@/components/site/DownloadsView";

export const Route = createFileRoute("/downloads")({
  head: () => ({
    meta: [
      { title: "Downloads | LOVAN" },
      { name: "description", content: "Films and series you saved to watch offline inside LOVAN." },
      { property: "og:title", content: "Downloads | LOVAN" },
      { property: "og:description", content: "Watch saved LOVAN titles without a connection." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DownloadsPage,
});

function DownloadsPage() {
  return <DownloadsView />;
}
