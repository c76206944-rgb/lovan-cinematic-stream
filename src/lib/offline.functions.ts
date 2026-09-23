import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Id = z.object({ id: z.string().uuid() });

export const getPublicCatalogTitle = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => Id.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("catalog_titles")
      .select(
        "id, name, kind, year, country, language, genres, runtime, maturity, premium, synopsis, director, cast_members, video_path, series_name, season, episode",
      )
      .eq("id", data.id)
      .eq("published", true)
      .eq("archived", false)
      .maybeSingle();
    if (!row) return null;
    const { video_path, ...rest } = row;
    return { ...rest, hasVideo: Boolean(video_path) };
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
    if (!row || !row.published || row.archived || !row.video_path) {
      throw new Error("This title is not available offline.");
    }
    const { data: signed, error } = await supabaseAdmin.storage
      .from("media")
      .createSignedUrl(row.video_path, 600);
    if (error || !signed) throw new Error("Could not prepare the download.");
    return { url: signed.signedUrl };
  });
