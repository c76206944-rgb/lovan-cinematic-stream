import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { offlineEligible } from "./offline-policy";

const Id = z.object({ id: z.string().uuid() });

export const getPublicCatalogTitle = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => Id.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("catalog_titles")
      .select(
        "id, name, kind, year, country, language, genres, runtime, maturity, premium, synopsis, director, cast_members, video_path, offline_allowed, series_name, season, episode",
      )
      .eq("id", data.id)
      .eq("published", true)
      .eq("archived", false)
      .maybeSingle();
    if (!row) return null;
    const { video_path, offline_allowed, ...rest } = row;
    return { ...rest, hasVideo: Boolean(video_path), canDownload: Boolean(video_path) };
  });

export const getOfflineVideoUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Id.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("catalog_titles")
      .select("video_path, published, archived")
      .eq("id", data.id)
      .maybeSingle();
    if (!row || !offlineEligible(row) || !row.video_path) {
      throw new Error("This title is not available offline.");
    }
    if (/^https:\/\//.test(row.video_path)) return { url: row.video_path };
    if (row.video_path.startsWith("r2/")) {
      const r2 = await import("./r2.server");
      return { url: await r2.presign("GET", r2.r2Key(row.video_path), 600) };
    }
    const { data: signed, error } = await supabaseAdmin.storage
      .from("media")
      .createSignedUrl(row.video_path, 600);
    if (error || !signed) throw new Error("Could not prepare the download.");
    return { url: signed.signedUrl };
  });
