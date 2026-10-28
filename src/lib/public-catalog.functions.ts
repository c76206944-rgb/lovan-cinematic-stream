import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Title } from "@/data/titles";

const fields =
  "id, name, kind, year, country, language, genres, runtime, maturity, synopsis, director, cast_members, poster_url, series_name, season, episode, episode_title, video_path, video_bytes, offline_allowed, created_at";

/** Every published title, with short lived poster links. Storage paths are never returned. */
export const getCatalog = createServerFn({ method: "GET" }).handler(async (): Promise<Title[]> => {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // The database returns at most 1000 rows per request, so read the catalogue in pages.
    const PAGE = 1000;
    const rows: any[] = [];
    for (let from = 0; from < 20000; from += PAGE) {
      const { data, error } = await supabaseAdmin
        .from("catalog_titles")
        .select(fields)
        .eq("published", true)
        .eq("archived", false)
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) {
        console.warn("[getCatalog] Database query warning:", error.message);
        if (!rows.length) return [];
        break;
      }
      rows.push(...(data ?? []));
      if (!data || data.length < PAGE) break;
    }
    // Episodes without their own poster use the poster of another episode in the same series.
    const seriesPoster = new Map<string, { path: string; rank: number }>();
    for (const r of rows) {
      if (r.kind !== "series" || !r.poster_url) continue;
      const key = (r.series_name || r.name).toLowerCase();
      const rank = (r.season ?? 0) * 10000 + (r.episode ?? 0);
      const cur = seriesPoster.get(key);
      if (!cur || rank < cur.rank) seriesPoster.set(key, { path: r.poster_url, rank });
    }
    for (const r of rows) {
      if (r.kind === "series" && !r.poster_url) {
        const p = seriesPoster.get((r.series_name || r.name).toLowerCase());
        if (p) r.poster_url = p.path;
      }
    }
    const paths = rows.map((r) => r.poster_url).filter((p): p is string => Boolean(p) && !/^https:\/\//.test(p!));
    const signed = new Map<string, string>();
    for (const r of rows) if (r.poster_url && /^https:\/\//.test(r.poster_url)) signed.set(r.poster_url, r.poster_url);
    // Storage accepts at most 1000 paths per request, so sign posters in chunks.
    const unique = Array.from(new Set(paths));
    for (let i = 0; i < unique.length; i += 200) {
      try {
        const { data: urls, error } = await supabaseAdmin.storage.from("media").createSignedUrls(unique.slice(i, i + 200), 60 * 60 * 6);
        if (error) console.warn("[getCatalog] Storage signed URLs warning:", error.message);
        for (const u of urls ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
      } catch (storageError) {
        console.warn("[getCatalog] Storage signed URLs warning:", storageError);
      }
    }
    return rows.map((r) => ({
      id: r.id,
      name: r.kind === "series" ? r.series_name || r.name : r.name,
      year: r.year,
      kind: r.kind === "series" ? "series" : "movie",
      country: r.country ?? "",
      language: r.language ?? "",
      genres: r.genres ?? [],
      runtime: r.runtime ?? "",
      maturity: r.maturity ?? "",
      image: (r.poster_url && signed.get(r.poster_url)) || "",
      synopsis: r.synopsis ?? "",
      director: r.director ?? "",
      cast: r.cast_members ?? [],
      seriesName: r.series_name || r.name,
      season: r.season,
      episode: r.episode,
      episodeTitle: r.episode_title || (r.kind === "series" ? r.name : ""),
      hasVideo: Boolean(r.video_path),
      canDownload: Boolean(r.video_path),
      addedAt: r.created_at,
      bytes: r.video_bytes ?? null,
    }));
  } catch (err) {
    console.warn("[getCatalog] Safe SSR fallback activated:", err);
    return [];
  }
});

/** Short lived link to watch a published title. */
export const getPlaybackUrl = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: row } = await supabaseAdmin
        .from("catalog_titles")
        .select("video_path, published, archived")
        .eq("id", data.id)
        .maybeSingle();
      if (!row || !row.published || row.archived || !row.video_path) throw new Error("This title cannot be played yet.");
      // Free open films are hosted by their makers and stream straight from there.
      if (/^https:\/\//.test(row.video_path)) return { url: row.video_path };
    if (row.video_path.startsWith("r2/")) {
      const r2 = await import("./r2.server");
      return { url: await r2.presign("GET", r2.r2Key(row.video_path), 60 * 60 * 3) };
    }
      const { data: s, error } = await supabaseAdmin.storage.from("media").createSignedUrl(row.video_path, 60 * 60 * 3);
      if (error || !s) throw new Error("Could not start playback.");
      return { url: s.signedUrl };
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Could not start playback.");
    }
  });
