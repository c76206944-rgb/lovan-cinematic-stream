import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { readImageSize } from "./image-size";

const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm", "application/vnd.apple.mpegurl", "application/x-mpegurl"];
const POSTER_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_VIDEO = 2 * 1024 * 1024 * 1024;
const MAX_POSTER = 10 * 1024 * 1024;
const MIN_POSTER_W = 480;
const MIN_POSTER_H = 270;
const MAX_POSTER_SIDE = 8000;

type Ctx = { supabase: any; userId: string };

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
    synopsis: z.string().trim().min(20, "Synopsis must be at least 20 characters.").max(2000),
    genres: list(3).min(1, "Add at least one genre."),
    cast_members: list(20),
    director: z.string().trim().max(120),
    country: z.string().trim().min(1, "Country is required.").max(80),
    language: z.string().trim().min(1, "Language is required.").max(80),
    runtime: z.string().trim().max(40),
    maturity: z.string().trim().min(1, "Maturity rating is required.").max(20),
    year: z.number().int().min(1888).max(new Date().getFullYear() + 3),
    premium: z.boolean(),
    published: z.boolean(),
    ad_enabled: z.boolean(),
    ad_placements: z.array(z.enum(["pre_roll", "mid_roll", "post_roll", "banner", "sponsored_card"])).max(5),
    ad_cues: z.string().trim().max(500),
    ad_notes: z.string().trim().max(2000),
    video_path: z.string().regex(/^videos\/[A-Za-z0-9._-]+$/).nullable().optional(),
    poster_url: z.string().regex(/^posters\/[A-Za-z0-9._-]+$/).nullable().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "series" && (v.season === null || v.episode === null)) {
      ctx.addIssue({ code: "custom", message: "Series uploads need a season and episode number." });
    }
    if (v.ad_cues && !/^(\d{2}:\d{2}:\d{2})(\s*,\s*\d{2}:\d{2}:\d{2})*$/.test(v.ad_cues)) {
      ctx.addIssue({ code: "custom", message: "Cue points must look like 00:14:30, 00:38:00." });
    }
    if (v.published && !v.video_path && !v.id) {
      ctx.addIssue({ code: "custom", message: "A video file is required before publishing." });
    }
  });

async function objectInfo(context: Ctx, path: string) {
  const slash = path.indexOf("/");
  const folder = path.slice(0, slash);
  const file = path.slice(slash + 1);
  const { data, error } = await context.supabase.storage.from("media").list(folder, { search: file, limit: 5 });
  if (error) throw new Error(error.message);
  const hit = (data ?? []).find((item: any) => item.name === file);
  if (!hit) throw new Error(`Uploaded file not found: ${file}`);
  return { size: Number(hit.metadata?.size ?? 0), mimetype: String(hit.metadata?.mimetype ?? "") };
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

    try {
      if (data.video_path) {
        const info = await objectInfo(context, data.video_path);
        const byExt = /\.(mp4|mov|webm|m3u8)$/i.test(data.video_path);
        if (!VIDEO_TYPES.includes(info.mimetype) || !byExt) throw new Error("Video must be MP4, MOV, WebM or HLS.");
        if (info.size <= 0 || info.size > MAX_VIDEO) throw new Error("Video must be under 2 GB.");
        extra["video_bytes"] = info.size;
      }
      if (data.poster_url) {
        const info = await objectInfo(context, data.poster_url);
        if (!POSTER_TYPES.includes(info.mimetype)) throw new Error("Poster must be JPEG, PNG or WebP.");
        if (info.size <= 0 || info.size > MAX_POSTER) throw new Error("Poster must be under 10 MB.");
        const { data: blob, error } = await context.supabase.storage.from("media").download(data.poster_url);
        if (error || !blob) throw new Error("Could not read the poster.");
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const size = readImageSize(bytes);
        if (!size || size.type !== info.mimetype) throw new Error("Poster file content does not match its type.");
        if (size.width < MIN_POSTER_W || size.height < MIN_POSTER_H)
          throw new Error(`Poster must be at least ${MIN_POSTER_W} by ${MIN_POSTER_H} pixels.`);
        if (size.width > MAX_POSTER_SIDE || size.height > MAX_POSTER_SIDE)
          throw new Error(`Poster must be at most ${MAX_POSTER_SIDE} pixels on each side.`);
        extra["poster_width"] = size.width;
        extra["poster_height"] = size.height;
      }
    } catch (cause) {
      if (!data.id) await removeQuietly(context, [data.video_path, data.poster_url]);
      throw cause;
    }

    const { id, ...fields } = data;
    const row: Record<string, unknown> = { ...fields, ...extra, updated_at: new Date().toISOString() };
    if (row["video_path"] === undefined) delete row["video_path"];
    if (row["poster_url"] === undefined) delete row["poster_url"];
    if (data.kind === "movie") {
      row["season"] = null;
      row["episode"] = null;
      row["series_name"] = "";
      row["episode_title"] = "";
    }

    if (id) {
      const { data: before } = await context.supabase.from("catalog_titles").select("video_path, poster_url").eq("id", id).single();
      const { error } = await context.supabase.from("catalog_titles").update(row).eq("id", id);
      if (error) throw new Error(error.message);
      if (before) {
        await removeQuietly(context, [
          data.video_path && before.video_path !== data.video_path ? before.video_path : null,
          data.poster_url && before.poster_url !== data.poster_url ? before.poster_url : null,
        ]);
      }
      return { id };
    }
    const { data: inserted, error } = await context.supabase
      .from("catalog_titles")
      .insert({ ...row, created_by: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: inserted.id as string };
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
