import { createFileRoute } from "@tanstack/react-router";
import { collapseSeries, matchesSearch, uniq } from "@/data/titles";
import { useCatalog } from "@/lib/use-catalog";
import { PageHeading, TitleGrid } from "@/components/site/TitleGrid";

export const Route = createFileRoute("/movies")({
  head: () => ({
    meta: [
      { title: "Movies | LOVAN" },
      {
        name: "description",
        content: "Feature films from filmmakers and rights holders around the world on LOVAN.",
      },
      { property: "og:title", content: "Movies | LOVAN" },
      { property: "og:description", content: "Feature films from around the world on LOVAN." },
    ],
  }),
  component: MoviesPage,
});

function MoviesPage() {
  const { titles: all } = useCatalog();
  const titles = collapseSeries(all);
  const items = titles.filter((t) => t.kind === "movie");
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6">
      <PageHeading
        title="Movies"
        description="Feature films licensed for your territory. Availability follows the rights held for each country."
      />
      <TitleGrid items={items} />
    </div>
  );
}
