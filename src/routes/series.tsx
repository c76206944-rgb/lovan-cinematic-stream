import { createFileRoute } from "@tanstack/react-router";
import { collapseSeries, matchesSearch, uniq } from "@/data/titles";
import { useCatalog } from "@/lib/use-catalog";
import { PageHeading, TitleGrid } from "@/components/site/TitleGrid";

export const Route = createFileRoute("/series")({
  head: () => ({
    meta: [
      { title: "Series | LOVAN" },
      {
        name: "description",
        content: "Episodic series and limited series available on LOVAN.",
      },
      { property: "og:title", content: "Series | LOVAN" },
      { property: "og:description", content: "Episodic and limited series on LOVAN." },
    ],
  }),
  component: SeriesPage,
});

function SeriesPage() {
  const { titles: all } = useCatalog();
  const titles = collapseSeries(all);
  const items = titles.filter((t) => t.kind === "series");
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6">
      <PageHeading
        title="Series"
        description="Episodic and limited series, with audio and subtitle options listed on each title page."
      />
      <TitleGrid items={items} />
    </div>
  );
}
