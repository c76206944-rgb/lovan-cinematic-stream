import { createFileRoute } from "@tanstack/react-router";
import { collapseSeries } from "@/data/titles";
import { useCatalog } from "@/lib/use-catalog";
import { PageHeading, TitleGrid } from "@/components/site/TitleGrid";

export const Route = createFileRoute("/my-list")({
  head: () => ({
    meta: [
      { title: "My List | LOVAN" },
      { name: "description", content: "Titles you saved to watch later on LOVAN." },
      { property: "og:title", content: "My List | LOVAN" },
      { property: "og:description", content: "Titles you saved to watch later on LOVAN." },
    ],
  }),
  component: MyListPage,
});

function MyListPage() {
  const { titles: all } = useCatalog();
  const titles = collapseSeries(all);
  const items = titles.slice(0, 6);
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6">
      <PageHeading
        title="My List"
        description="Everything you saved for later. New uploads are shown here until saving to your list is ready."
      />
      <TitleGrid items={items} />
    </div>
  );
}
