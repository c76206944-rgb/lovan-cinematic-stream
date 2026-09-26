import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/use-account";

export type Collection = {
  id: string;
  label: string;
  placement: "hero" | "rail";
  position: number;
  title_ids: string[];
  published: boolean;
};

export const collectionsQuery = queryOptions({
  queryKey: ["collections"],
  queryFn: async (): Promise<Collection[]> => {
    const { data } = await supabase.from("collections").select("*").order("position", { ascending: true });
    return (data ?? []) as Collection[];
  },
  staleTime: 60_000,
});

export function useCollections() {
  return useQuery(collectionsQuery).data ?? [];
}

/** Titles the signed in viewer saved to My List. */
export function useWatchlist() {
  const { userId } = useAccount();
  const qc = useQueryClient();
  const key = ["watchlist", userId];
  const q = useQuery({
    queryKey: key,
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data } = await supabase.from("watchlist").select("title_id, created_at").order("created_at", { ascending: false });
      return (data ?? []).map((r) => r.title_id);
    },
  });
  const ids = q.data ?? [];
  const toggle = async (titleId: string) => {
    if (!userId) return false;
    if (ids.includes(titleId)) {
      await supabase.from("watchlist").delete().eq("user_id", userId).eq("title_id", titleId);
    } else {
      await supabase.from("watchlist").insert({ user_id: userId, title_id: titleId });
    }
    await qc.invalidateQueries({ queryKey: key });
    return true;
  };
  return { ids, signedIn: Boolean(userId), loading: q.isLoading, toggle };
}

export type Progress = { title_id: string; position_seconds: number; duration_seconds: number; updated_at: string };

/** Where the viewer stopped in each title, newest first. */
export function useProgress() {
  const { userId } = useAccount();
  const q = useQuery({
    queryKey: ["progress", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Progress[]> => {
      const { data } = await supabase
        .from("watch_progress")
        .select("title_id, position_seconds, duration_seconds, updated_at")
        .order("updated_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });
  return q.data ?? [];
}

export async function saveProgress(userId: string, titleId: string, position: number, duration: number) {
  if (!duration || !Number.isFinite(duration)) return;
  await supabase.from("watch_progress").upsert({
    user_id: userId,
    title_id: titleId,
    position_seconds: position,
    duration_seconds: duration,
    updated_at: new Date().toISOString(),
  });
}

export async function loadProgress(titleId: string): Promise<number> {
  const { data } = await supabase.from("watch_progress").select("position_seconds, duration_seconds").eq("title_id", titleId).maybeSingle();
  if (!data) return 0;
  // Start over when the viewer had nearly finished.
  return data.position_seconds > data.duration_seconds - 30 ? 0 : data.position_seconds;
}
