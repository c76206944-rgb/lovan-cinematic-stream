import { createFileRoute } from "@tanstack/react-router";
import { collapseSeries } from "@/data/titles";
import { useCatalog } from "@/lib/use-catalog";
import { PageHeading, TitleGrid } from "@/components/site/TitleGrid";

export const Route = createFileRoute("/new-releases")({
  head: () => ({
    meta: [
      { title: "New Releases | LOVAN" },
      { name: "description", content: "The newest films, series and documentaries added to LOVAN." },
      { property: "og:title", content: "New Releases | LOVAN" },
      { property: "og:description", content: "The newest titles added to LOVAN." },
    ],
  }),
  component: NewReleases,
});

function NewReleases() {
  const { titles: all } = useCatalog();
  const items = collapseSeries(all).slice(0, 24);
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6">
      <PageHeading
        title="New Releases"
        description="Recently added and recently licensed titles, newest first."
      />
      <TitleGrid items={items} />
    </div>
  );
}
