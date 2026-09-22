import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { genres, titles } from "@/data/titles";
import { PageHeading, TitleGrid } from "@/components/site/TitleGrid";

export const Route = createFileRoute("/genres")({
  head: () => ({
    meta: [
      { title: "Genres | LOVAN" },
      { name: "description", content: "Browse the LOVAN catalogue by genre." },
      { property: "og:title", content: "Genres | LOVAN" },
      { property: "og:description", content: "Browse the LOVAN catalogue by genre." },
    ],
  }),
  component: GenresPage,
});

function GenresPage() {
  const [active, setActive] = useState<string>(genres[0] ?? "Drama");
  const items = titles.filter((t) => t.genres.includes(active));

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6">
      <PageHeading title="Genres" description="Pick a genre to see everything licensed for you." />
      <div className="mb-8 flex flex-wrap gap-2">
        {genres.map((genre) => (
          <button
            key={genre}
            type="button"
            onClick={() => setActive(genre)}
            className={`rounded-sm border px-3 py-1.5 text-xs transition-colors ${
              genre === active
                ? "border-primary text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {genre}
          </button>
        ))}
      </div>
      <TitleGrid items={items} />
    </div>
  );
}
