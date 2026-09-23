import { createFileRoute } from "@tanstack/react-router";
import { collapseSeries } from "@/data/titles";
import { useCatalog } from "@/lib/use-catalog";
import { PageHeading, TitleGrid } from "@/components/site/TitleGrid";

export const Route = createFileRoute("/trending")({
  head: () => ({
    meta: [
      { title: "Trending | LOVAN" },
      { name: "description", content: "The titles people are watching most on LOVAN right now." },
      { property: "og:title", content: "Trending | LOVAN" },
      { property: "og:description", content: "The most watched titles on LOVAN right now." },
    ],
  }),
  component: TrendingPage,
});

function TrendingPage() {
  const { titles: all } = useCatalog();
  const titles = collapseSeries(all);
  const items = titles.slice(0, 24);
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6">
      <PageHeading
        title="Trending"
        description="What audiences are watching most this week, across every region where rights allow."
      />
      <TitleGrid items={items} />
    </div>
  );
}
