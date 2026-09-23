import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { collapseSeries, matchesSearch } from "@/data/titles";
import { useCatalog } from "@/lib/use-catalog";
import { PageHeading, TitleGrid } from "@/components/site/TitleGrid";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search | LOVAN" },
      { name: "description", content: "Search films, series, documentaries and shorts on LOVAN." },
      { property: "og:title", content: "Search | LOVAN" },
      { property: "og:description", content: "Search the LOVAN catalogue." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { titles: all } = useCatalog();
  const titles = collapseSeries(all);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const items = q ? collapseSeries(all.filter((t) => matchesSearch(t, q))) : titles;

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6">
      <PageHeading
        title="Search"
        description="Search by title, genre, country, language, director or cast."
      />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search LOVAN"
        className="mb-8 w-full max-w-xl rounded-md border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground"
      />
      <TitleGrid items={items} />
    </div>
  );
}
