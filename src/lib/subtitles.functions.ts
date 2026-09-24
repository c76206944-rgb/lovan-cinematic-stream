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

async function requireStaff(context: { supabase: { rpc: (n: string, a: Record<string, unknown>) => Promise<{ data: unknown }> }; userId: string }) {
  const { data: staff } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
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
    const body = data.vtt.trim().startsWith("WEBVTT") ? data.vtt : `WEBVTT\n\n${data.vtt}`;
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
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

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

    const lovable = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey: key,
      headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });

    const result = streamText({
      model: lovable.responses("openai/gpt-6-astra"),
      system: [
        "You translate WebVTT subtitle files.",
        "Return only a valid WebVTT file. Keep the WEBVTT header, every cue, every timestamp and every cue order exactly as given.",
        "Translate only the spoken text lines. Keep personal names and place names in their established form.",
        "No notes, no explanations, no code fences.",
      ].join(" "),
      prompt: `Translate the subtitle text into ${data.toLabel} (${data.toLang}).\n\n${text}`,
      providerOptions: {
        openai: { forceReasoning: true, reasoningEffort: "low", store: false },
      },
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
  .handler(async ({ data, context }): Promise<{ path: string }> => {
    await requireStaff(context);
    const response = await fetch(data.url);
    if (!response.ok) throw new Error("That picture link could not be opened.");
    const type = response.headers.get("content-type") ?? "image/jpeg";
    if (!type.startsWith("image/")) throw new Error("That link is not a picture.");
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 12_000_000) throw new Error("That picture is too large.");
    const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
    const path = `posters/${Date.now()}-web.${ext}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.storage
      .from("media")
      .upload(path, new Blob([bytes], { type }), { contentType: type, upsert: false });
    if (error) throw new Error(error.message);
    return { path };
  });
