import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { countries, genres, languages, titles } from "@/data/titles";
import { PageHeading, TitleGrid } from "@/components/site/TitleGrid";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore | LOVAN" },
      {
        name: "description",
        content: "Filter the LOVAN catalogue by genre, country, language and type.",
      },
      { property: "og:title", content: "Explore | LOVAN" },
      { property: "og:description", content: "Filter the LOVAN catalogue by genre and country." },
    ],
  }),
  component: ExplorePage,
});

const kinds = ["all", "movie", "series", "documentary", "short"] as const;

function ExplorePage() {
  const [kind, setKind] = useState<string>("all");
  const [genre, setGenre] = useState<string>("all");
  const [country, setCountry] = useState<string>("all");
  const [language, setLanguage] = useState<string>("all");

  const items = titles.filter(
    (t) =>
      (kind === "all" || t.kind === kind) &&
      (genre === "all" || t.genres.includes(genre)) &&
      (country === "all" || t.country === country) &&
      (language === "all" || t.language === language),
  );

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6">
      <PageHeading
        title="Explore"
        description="Narrow the catalogue by type, genre, country and original language."
      />
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select label="Type" value={kind} onChange={setKind} options={[...kinds]} allLabel={null} />
        <Select label="Genre" value={genre} onChange={setGenre} options={genres} allLabel="all" />
        <Select
          label="Country"
          value={country}
          onChange={setCountry}
          options={countries}
          allLabel="all"
        />
        <Select
          label="Language"
          value={language}
          onChange={setLanguage}
          options={languages}
          allLabel="all"
        />
      </div>
      <TitleGrid items={items} />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  allLabel: string | null;
}) {
  const list = allLabel ? [allLabel, ...options] : options;
  return (
    <label className="block text-xs text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
      >
        {list.map((option) => (
          <option key={option} value={option}>
            {option === "all" ? "All" : option}
          </option>
        ))}
      </select>
    </label>
  );
}
