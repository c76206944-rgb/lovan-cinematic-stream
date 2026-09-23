import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Title } from "@/data/titles";

const fields =
  "id, name, kind, year, country, language, genres, runtime, maturity, synopsis, director, cast_members, poster_url, series_name, season, episode, episode_title, video_path, offline_allowed, created_at";

/** Every published title, with short lived poster links. Storage paths are never returned. */
export const getCatalog = createServerFn({ method: "GET" }).handler(async (): Promise<Title[]> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("catalog_titles")
    .select(fields)
    .eq("published", true)
    .eq("archived", false)
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const paths = rows.map((r) => r.poster_url).filter((p): p is string => Boolean(p));
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: urls } = await supabaseAdmin.storage.from("media").createSignedUrls(paths, 60 * 60 * 6);
    for (const u of urls ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
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
    canDownload: Boolean(r.video_path) && Boolean(r.offline_allowed),
    addedAt: r.created_at,
  }));
});

/** Short lived link to watch a published title. */
export const getPlaybackUrl = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("catalog_titles")
      .select("video_path, published, archived")
      .eq("id", data.id)
      .maybeSingle();
    if (!row || !row.published || row.archived || !row.video_path) throw new Error("This title cannot be played yet.");
    const { data: s, error } = await supabaseAdmin.storage.from("media").createSignedUrl(row.video_path, 60 * 60 * 3);
    if (error || !s) throw new Error("Could not start playback.");
    return { url: s.signedUrl };
  });
