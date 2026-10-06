import { createServerFn } from "@tanstack/react-start";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StoredTrack = { lang: string; label: string; path: string };
export type PlayableTrack = { lang: string; label: string; url: string };

const trackList = z.array(z.object({ lang: z.string(), label: z.string(), path: z.string() }));

const readTracks = (value: unknown): StoredTrack[] => {
  const parsed = trackList.safeParse(value);
  return parsed.success ? parsed.data : [];
};

/** Subtitle files for one title, as short lived links the player can read. */
export const getSubtitleTracks = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }): Promise<PlayableTrack[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("catalog_titles")
      .select("subtitles, published, archived")
      .eq("id", data.id)
      .maybeSingle();
    if (!row || !row.published || row.archived) return [];
    const tracks = readTracks(row.subtitles);
    if (!tracks.length) return [];
    const { data: urls } = await supabaseAdmin.storage
      .from("media")
      .createSignedUrls(tracks.map((t) => t.path), 60 * 60 * 3);
    const signed = new Map((urls ?? []).map((u) => [u.path ?? "", u.signedUrl]));
    return tracks
      .map((t) => ({ lang: t.lang, label: t.label, url: signed.get(t.path) ?? "" }))
      .filter((t) => Boolean(t.url));
  });

async function requireStaff(context: { supabase: { rpc: (...args: never[]) => unknown }; userId: string }) {
  const rpc = context.supabase.rpc as unknown as (n: string, a: Record<string, unknown>) => Promise<{ data: unknown }>;
  const { data: staff } = await rpc("is_staff", { _user_id: context.userId });
  if (!staff) throw new Error("Forbidden");
}


/** Staff list of the subtitle files saved on a title. */
export const listSubtitleTracks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<StoredTrack[]> => {
    await requireStaff(context);
    const { data: row } = await context.supabase
      .from("catalog_titles")
      .select("subtitles")
      .eq("id", data.id)
      .maybeSingle();
    return readTracks(row?.subtitles);
  });

const SaveInput = z.object({
  id: z.string().uuid(),
  lang: z.string().trim().min(2).max(12),
  label: z.string().trim().min(1).max(60),
  vtt: z.string().min(10).max(2_000_000),
});

/** Saves a subtitle file against a title. */
export const saveSubtitleTrack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveInput.parse(input))
  .handler(async ({ data, context }): Promise<StoredTrack[]> => {
    await requireStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const raw = data.vtt.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
    // SRT files use commas in timestamps; WebVTT needs dots.
    const body = raw.startsWith("WEBVTT")
      ? raw
      : `WEBVTT\n\n${raw.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2")}`;
    const path = `subtitles/${data.id}-${data.lang}.vtt`;
    const { error } = await supabaseAdmin.storage
      .from("media")
      .upload(path, new Blob([body], { type: "text/vtt" }), { contentType: "text/vtt", upsert: true });
    if (error) throw new Error(error.message);

    const { data: row } = await supabaseAdmin
      .from("catalog_titles")
      .select("subtitles")
      .eq("id", data.id)
      .maybeSingle();
    const tracks = readTracks(row?.subtitles).filter((t) => t.lang !== data.lang);
    const next = [...tracks, { lang: data.lang, label: data.label, path }];
    const { error: saveError } = await supabaseAdmin
      .from("catalog_titles")
      .update({ subtitles: next })
      .eq("id", data.id);
    if (saveError) throw new Error(saveError.message);
    return next;
  });

/** Removes one subtitle language from a title. */
export const removeSubtitleTrack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), lang: z.string().min(2).max(12) }).parse(input))
  .handler(async ({ data, context }): Promise<StoredTrack[]> => {
    await requireStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("catalog_titles")
      .select("subtitles")
      .eq("id", data.id)
      .maybeSingle();
    const tracks = readTracks(row?.subtitles);
    const gone = tracks.find((t) => t.lang === data.lang);
    const next = tracks.filter((t) => t.lang !== data.lang);
    if (gone) await supabaseAdmin.storage.from("media").remove([gone.path]);
    await supabaseAdmin.from("catalog_titles").update({ subtitles: next }).eq("id", data.id);
    return next;
  });

const TranslateInput = z.object({
  id: z.string().uuid(),
  fromLang: z.string().min(2).max(12),
  toLang: z.string().min(2).max(12),
  toLabel: z.string().trim().min(1).max(60),
});

/** Translates an existing subtitle file into another language, keeping the timings. */
export const translateSubtitleTrack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => TranslateInput.parse(input))
  .handler(async ({ data, context }): Promise<StoredTrack[]> => {
    await requireStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("catalog_titles")
      .select("subtitles")
      .eq("id", data.id)
      .maybeSingle();
    const tracks = readTracks(row?.subtitles);
    const source = tracks.find((t) => t.lang === data.fromLang);
    if (!source) throw new Error("That subtitle language is not saved on this title.");

    const file = await supabaseAdmin.storage.from("media").download(source.path);
    if (file.error || !file.data) throw new Error("The subtitle file could not be read.");
    const text = await file.data.text();
    if (text.length > 120_000) throw new Error("This subtitle file is too long to translate in one go.");

    const { pickModel } = await import("@/lib/ai-model.server");
    const ai = pickModel("low");
    void createOpenAI;

    const result = streamText({
      model: ai.model,
      system: [
        "You translate WebVTT subtitle files.",
        "Return only a valid WebVTT file. Keep the WEBVTT header, every cue, every timestamp and every cue order exactly as given.",
        "Translate only the spoken text lines. Keep personal names and place names in their established form.",
        "No notes, no explanations, no code fences.",
      ].join(" "),
      prompt: `Translate the subtitle text into ${data.toLabel} (${data.toLang}).\n\n${text}`,
      providerOptions: ai.providerOptions,
    });

    let translated = (await result.text).trim();
    translated = translated.replace(/^```[a-z]*\n?/i, "").replace(/```$/, "").trim();
    if (!translated.startsWith("WEBVTT")) translated = `WEBVTT\n\n${translated}`;

    const path = `subtitles/${data.id}-${data.toLang}.vtt`;
    const { error } = await supabaseAdmin.storage
      .from("media")
      .upload(path, new Blob([translated], { type: "text/vtt" }), { contentType: "text/vtt", upsert: true });
    if (error) throw new Error(error.message);

    const next = [...tracks.filter((t) => t.lang !== data.toLang), { lang: data.toLang, label: data.toLabel, path }];
    await supabaseAdmin.from("catalog_titles").update({ subtitles: next }).eq("id", data.id);
    return next;
  });

/** Copies a picture from a web address into the private media store. */
export const importPosterFromUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ url: z.string().url() }).parse(input))
  .handler(async ({ data, context }): Promise<{ path: string; width: number; height: number }> => {
    await requireStaff(context);
    const { upgradePosterUrl } = await import("@/lib/poster-source");
    const { readImageSize } = await import("@/lib/image-size");

    let best: { bytes: ArrayBuffer; type: string; width: number; height: number } | null = null;
    let lastError = "That picture link could not be opened.";

    for (const candidate of upgradePosterUrl(data.url)) {
      try {
        const response = await fetch(candidate);
        if (!response.ok) continue;
        const type = response.headers.get("content-type") ?? "image/jpeg";
        if (!type.startsWith("image/")) {
          lastError = "That link is not a picture.";
          continue;
        }
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength > 20_000_000) {
          lastError = "That picture is too large.";
          continue;
        }
        const size = readImageSize(new Uint8Array(bytes.slice(0, 64_000)));
        const width = size?.width ?? 0;
        const height = size?.height ?? 0;
        if (!best || width * height > best.width * best.height) {
          best = { bytes, type, width, height };
        }
        // A good sized poster is enough, no need to try the rest.
        if (width >= 1000 && height >= 1400) break;
      } catch {
        continue;
      }
    }

    if (!best) throw new Error(lastError);
    if (best.width && best.height && (best.width < 400 || best.height < 600)) {
      throw new Error(
        `That picture is only ${best.width} by ${best.height} and too small for a poster. Look for a larger one.`,
      );
    }

    const ext = best.type.includes("png") ? "png" : best.type.includes("webp") ? "webp" : "jpg";
    const path = `posters/${Date.now()}-web.${ext}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.storage
      .from("media")
      .upload(path, new Blob([best.bytes], { type: best.type }), { contentType: best.type, upsert: false });
    if (error) throw new Error(error.message);
    return { path, width: best.width, height: best.height };
  });
