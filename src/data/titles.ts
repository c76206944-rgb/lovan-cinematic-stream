import still01 from "@/assets/still-01.jpg";
import still02 from "@/assets/still-02.jpg";
import still03 from "@/assets/still-03.jpg";
import still04 from "@/assets/still-04.jpg";

export type TitleKind = "movie" | "series";

export type Title = {
  id: string;
  name: string;
  year: number;
  kind: TitleKind;
  country: string;
  language: string;
  genres: string[];
  runtime: string;
  maturity: string;
  image: string;
  synopsis: string;
  director: string;
  cast: string[];
  seriesName: string;
  season: number | null;
  episode: number | null;
  episodeTitle: string;
  hasVideo: boolean;
  canDownload: boolean;
  addedAt: string;
};

export type Rail = { id: string; heading: string; items: Title[] };

const fallbacks = [still01, still02, still03, still04];
/** Artwork used when a title has no poster yet. */
export const fallbackImage = (id: string) => fallbacks[(id.charCodeAt(0) + id.charCodeAt(1)) % fallbacks.length] as string;

/** One card per series (its first episode) plus every film. */
export function collapseSeries(items: Title[]): Title[] {
  const seen = new Set<string>();
  const sorted = [...items].sort((a, b) => (a.season ?? 0) - (b.season ?? 0) || (a.episode ?? 0) - (b.episode ?? 0));
  const out: Title[] = [];
  for (const t of sorted) {
    if (t.kind === "series") {
      const key = t.seriesName.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
    }
    out.push(t);
  }
  return out.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
}

export function matchesSearch(t: Title, q: string) {
  return [t.name, t.seriesName, t.episodeTitle, t.country, t.language, t.director, t.synopsis, String(t.year), ...t.genres, ...t.cast]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

export const uniq = (values: string[]) => Array.from(new Set(values.filter(Boolean))).sort();

export function buildRails(all: Title[]): Rail[] {
  const items = collapseSeries(all);
  const rails: Rail[] = [
    { id: "new", heading: "New on LOVAN", items: items.slice(0, 12) },
    { id: "movies", heading: "Movies", items: items.filter((t) => t.kind === "movie") },
    { id: "series", heading: "Series", items: items.filter((t) => t.kind === "series") },
  ];
  for (const g of uniq(items.flatMap((t) => t.genres))) {
    rails.push({ id: `genre-${g}`, heading: g, items: items.filter((t) => t.genres.includes(g)) });
  }
  return rails;
}
