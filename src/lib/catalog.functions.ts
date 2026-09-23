import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { readImageSize } from "./image-size";


type Ctx = { supabase: any; userId: string };

const duplicateFields = "id, name, kind, series_name, season, episode, year, published, archived";

function existingSummary(row: any) {
  return {
    id: row.id as string,
    name: row.name as string,
    kind: row.kind as "movie" | "series",
    seriesName: (row.series_name ?? "") as string,
    season: row.season as number | null,
    episode: row.episode as number | null,
    year: row.year as number,
    published: Boolean(row.published),
    archived: Boolean(row.archived),
  };
}

async function assertStaff(context: Ctx) {
  const { data } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
  if (!data) throw new Error("Only studio staff can do this.");
}

const list = (max: number) => z.array(z.string().trim().min(1).max(80)).max(max);

const TitleInput = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1, "Title name is required.").max(200),
    kind: z.enum(["movie", "series"]),
    series_name: z.string().trim().max(200).default(""),
    season: z.number().int().min(1).max(100).nullable().default(null),
    episode: z.number().int().min(1).max(1000).nullable().default(null),
    episode_title: z.string().trim().max(200).default(""),
    synopsis: z.string().trim().max(4000).default(""),
    genres: list(10).default([]),
    cast_members: list(20),
    director: z.string().trim().max(120),
    country: z.string().trim().max(80).default(""),
    language: z.string().trim().max(80).default(""),
    runtime: z.string().trim().max(40),
    maturity: z.string().trim().max(20).default(""),
    year: z.number().int().min(1800).max(3000).default(new Date().getFullYear()),
    premium: z.boolean(),
    published: z.boolean(),
    ad_enabled: z.boolean(),
    ad_placements: z.array(z.enum(["pre_roll", "mid_roll", "post_roll", "banner", "sponsored_card"])).max(5),
    ad_cues: z.string().trim().max(500).default(""),
    ad_notes: z.string().trim().max(2000),
    video_path: z.string().regex(/^videos\/[A-Za-z0-9._-]+$/).nullable().optional(),
    poster_url: z.string().regex(/^posters\/[A-Za-z0-9._-]+$/).nullable().optional(),
    offline_allowed: z.boolean().optional(),
    upload_key: z.string().uuid().optional(),
  });

async function objectInfo(context: Ctx, path: string) {
  const { data, error } = await context.supabase.storage.from("media").info(path);
  if (error || !data) throw new Error(`Uploaded file not found: ${path}`);
  return {
    size: Number(data.size ?? data.metadata?.size ?? 0),
    mimetype: String(data.contentType ?? data.metadata?.mimetype ?? ""),
  };
}

async function posterHead(context: Ctx, path: string) {
  // Only the first 256 KB is needed to read image dimensions.
  const { data, error } = await context.supabase.storage.from("media").createSignedUrl(path, 60);
  if (error || !data) throw new Error("Could not read the poster.");
  const res = await fetch(data.signedUrl, { headers: { Range: "bytes=0-262143" } });
  if (!res.ok) throw new Error("Could not read the poster.");
  return new Uint8Array(await res.arrayBuffer());
}

async function removeQuietly(context: Ctx, paths: (string | null | undefined)[]) {
  const clean = paths.filter((p): p is string => Boolean(p));
  if (clean.length) await context.supabase.storage.from("media").remove(clean);
}

export const saveTitle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const parsed = TitleInput.safeParse(input);
    if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(" "));
    return parsed.data;
  })
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const extra: Record<string, unknown> = {};

    // Retried saves reuse the same upload key, so a second attempt returns the first record.
    if (!data.id && data.upload_key) {
      const { data: existing } = await context.supabase
        .from("catalog_titles").select(duplicateFields).eq("upload_key", data.upload_key).maybeSingle();
      if (existing) return { id: existing.id as string, duplicate: true, existing: existingSummary(existing) };
    }
    if (!data.id) {
      let q = context.supabase.from("catalog_titles").select(duplicateFields).eq("kind", data.kind);
      q = data.kind === "series"
        ? q.ilike("series_name", data.series_name || data.name).eq("season", data.season ?? 0).eq("episode", data.episode ?? 0)
        : q.ilike("name", data.name).eq("year", data.year);
      const { data: clash } = await q.limit(1);
      if (clash && clash.length) {
        const existing = clash[0];
        if (existing) return { id: existing.id as string, duplicate: true, existing: existingSummary(existing) };
      }
    }

    // Lenient checks: record what we can, never refuse an upload.
    try {
      const [videoInfo, posterInfo, posterBytes] = await Promise.all([
        data.video_path ? objectInfo(context, data.video_path).catch(() => null) : null,
        data.poster_url ? objectInfo(context, data.poster_url).catch(() => null) : null,
        data.poster_url ? posterHead(context, data.poster_url).catch(() => null) : null,
      ]);
      if (videoInfo?.size) extra["video_bytes"] = videoInfo.size;
      const size = posterBytes ? readImageSize(posterBytes) : null;
      if (size) {
        extra["poster_width"] = size.width;
        extra["poster_height"] = size.height;
      }
      void posterInfo;
    } catch {
      /* ignore */
    }

    const { id, ...fields } = data;
    const row: Record<string, any> = { ...fields, ...extra, updated_at: new Date().toISOString() };
    if (row["video_path"] === undefined) delete row["video_path"];
    if (row["poster_url"] === undefined) delete row["poster_url"];
    if (row["offline_allowed"] === undefined) delete row["offline_allowed"];
    if (row["upload_key"] === undefined || id) delete row["upload_key"];
    if (data.kind === "movie") {
      row["season"] = null;
      row["episode"] = null;
      row["series_name"] = "";
      row["episode_title"] = "";
    }

    if (id) {
      const { data: before } = await context.supabase.from("catalog_titles").select("video_path, poster_url").eq("id", id).single();
      const { error } = await context.supabase.from("catalog_titles").update(row as never).eq("id", id);
      if (error) throw new Error(error.message);
      if (before) {
        await removeQuietly(context, [
          data.video_path && before.video_path !== data.video_path ? before.video_path : null,
          data.poster_url && before.poster_url !== data.poster_url ? before.poster_url : null,
        ]);
      }
      return { id, duplicate: false, existing: null };
    }
    const { data: inserted, error } = await context.supabase
      .from("catalog_titles")
      .insert({ ...row, created_by: context.userId } as never)
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505" && data.upload_key) {
        const { data: existing } = await context.supabase
            .from("catalog_titles").select(duplicateFields).eq("upload_key", data.upload_key).maybeSingle();
        if (existing) return { id: existing.id as string, duplicate: true, existing: existingSummary(existing) };
      }
      if (error.code === "23505") throw new Error("This title is already in the catalogue.");
      throw new Error(error.message);
    }
    return { id: inserted.id as string, duplicate: false, existing: null };
  });

export const setTitleStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), action: z.enum(["publish", "unpublish", "archive", "restore"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    if (data.action === "publish") {
      const { data: row } = await context.supabase.from("catalog_titles").select("video_path, synopsis, genres").eq("id", data.id).single();
      if (!row?.video_path) throw new Error("Add a video file before publishing.");
      if (!row.synopsis || row.genres.length === 0) throw new Error("Add a synopsis and genre before publishing.");
    }
    const patch =
      data.action === "publish"
        ? { published: true, archived: false }
        : data.action === "unpublish"
          ? { published: false }
          : data.action === "archive"
            ? { archived: true, published: false }
            : { archived: false };
    const { error } = await context.supabase
      .from("catalog_titles")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTitle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { data: row } = await context.supabase.from("catalog_titles").select("video_path, poster_url").eq("id", data.id).single();
    const { error } = await context.supabase.from("catalog_titles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (row) await removeQuietly(context, [row.video_path, row.poster_url]);
    return { ok: true };
  });

export const getCatalogAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data: rows, error } = await context.supabase
      .from("catalog_titles")
      .select("kind, published, archived, premium, ad_enabled, created_at, genres");
    if (error) throw new Error(error.message);
    const all = (rows ?? []) as { kind: string; published: boolean; archived: boolean; premium: boolean; ad_enabled: boolean; created_at: string; genres: string[] }[];
    const { data: storage } = await context.supabase.rpc("admin_storage_stats");

    const days: { day: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      days.push({ day: d, count: 0 });
    }
    const genreCounts: Record<string, number> = {};
    for (const r of all) {
      const d = r.created_at.slice(0, 10);
      const slot = days.find((x) => x.day === d);
      if (slot) slot.count++;
      for (const g of r.genres) genreCounts[g] = (genreCounts[g] ?? 0) + 1;
    }
    return {
      total: all.length,
      movies: all.filter((r) => r.kind === "movie").length,
      episodes: all.filter((r) => r.kind === "series").length,
      published: all.filter((r) => r.published && !r.archived).length,
      drafts: all.filter((r) => !r.published && !r.archived).length,
      archived: all.filter((r) => r.archived).length,
      premium: all.filter((r) => r.premium).length,
      withAds: all.filter((r) => r.ad_enabled).length,
      storage: ((storage ?? []) as { folder: string; files: number; bytes: number }[]).map((s) => ({
        folder: s.folder,
        files: Number(s.files),
        bytes: Number(s.bytes),
      })),
      activity: days,
      genres: Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, count]) => ({ name, count })),
    };
  });
