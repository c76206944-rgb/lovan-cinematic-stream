import { createServerFn } from "@tanstack/react-start";

export type ComingSoonItem = {
  id: string;
  name: string;
  kind: "movie" | "series";
  date: string;
  poster: string;
  overview: string;
};

type TmdbRow = {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  overview?: string;
  original_language?: string;
};

async function tmdb(path: string, key: string): Promise<TmdbRow[]> {
  const bearer = key.startsWith("eyJ");
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  if (!bearer) url.searchParams.set("api_key", key);
  const res = await fetch(url, {
    headers: bearer ? { Authorization: `Bearer ${key}`, accept: "application/json" } : { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  const json = (await res.json()) as { results?: TmdbRow[] };
  return json.results ?? [];
}

export const getComingSoon = createServerFn({ method: "GET" }).handler(async (): Promise<ComingSoonItem[]> => {
  const key = process.env["TMDB_API_KEY"];
  if (!key) return [];
  const today = new Date().toISOString().slice(0, 10);
  const until = new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10);
  try {
    const [movies, shows] = await Promise.all([
      tmdb(`/discover/movie?sort_by=popularity.desc&primary_release_date.gte=${today}&primary_release_date.lte=${until}&include_adult=false`, key),
      tmdb(`/discover/tv?sort_by=popularity.desc&first_air_date.gte=${today}&first_air_date.lte=${until}&include_adult=false`, key),
    ]);
    const map = (r: TmdbRow, kind: "movie" | "series"): ComingSoonItem | null => {
      const date = (kind === "movie" ? r.release_date : r.first_air_date) ?? "";
      const name = r.title ?? r.name ?? "";
      if (!r.poster_path || !date || !name) return null;
      return {
        id: `${kind}-${r.id}`,
        name,
        kind,
        date,
        poster: `https://image.tmdb.org/t/p/w342${r.poster_path}`,
        overview: r.overview ?? "",
      };
    };
    const items = [
      ...movies.slice(0, 14).map((r) => map(r, "movie")),
      ...shows.slice(0, 8).map((r) => map(r, "series")),
    ].filter((x): x is ComingSoonItem => Boolean(x));
    return items.sort((a, b) => a.date.localeCompare(b.date));
  } catch (e) {
    console.error("coming soon fetch failed", e);
    return [];
  }
});
