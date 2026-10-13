import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/use-account";

export type RatingStat = { title_id: string; average: number; votes: number };

export const ratingsKey = ["rating-stats"] as const;

/** Average score and vote count for every rated title. */
export function useRatingStats(): Map<string, RatingStat> {
  const q = useQuery({
    queryKey: ratingsKey,
    queryFn: async () => {
      const { data } = await supabase.rpc("rating_stats");
      return (data ?? []).map((r) => ({ title_id: r.title_id, average: Number(r.average), votes: Number(r.votes) }));
    },
    staleTime: 60_000,
  });
  return new Map((q.data ?? []).map((r) => [r.title_id, r]));
}

/** Five star rater. Signed in viewers can rate once and change their score. */
export function TitleRating({ titleId }: { titleId: string }) {
  const account = useAccount();
  const qc = useQueryClient();
  const stat = useRatingStats().get(titleId);
  const [mine, setMine] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    setMine(null);
    if (!account.userId) return;
    void supabase
      .from("title_ratings")
      .select("score")
      .eq("title_id", titleId)
      .eq("user_id", account.userId)
      .maybeSingle()
      .then(({ data }) => setMine(data?.score ?? null));
  }, [titleId, account.userId]);

  const rate = async (score: number) => {
    if (!account.userId) return;
    setMine(score);
    await supabase.from("title_ratings").upsert({ title_id: titleId, user_id: account.userId, score, updated_at: new Date().toISOString() });
    void qc.invalidateQueries({ queryKey: ratingsKey });
  };

  const shown = hover ?? mine ?? 0;
  return (
    <div className="mt-6">
      <div className="flex items-center gap-1" onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`Rate ${n} of 5`}
            disabled={!account.userId}
            onMouseEnter={() => account.userId && setHover(n)}
            onClick={() => void rate(n)}
            className={`text-2xl leading-none ${n <= shown ? "text-primary" : "text-muted-foreground"} disabled:cursor-default`}
          >
            ★
          </button>
        ))}
        <span className="ml-3 text-xs text-muted-foreground">
          {stat ? `${stat.average.toFixed(1)} / 5 from ${stat.votes} ${stat.votes === 1 ? "vote" : "votes"}` : "No ratings yet"}
        </span>
      </div>
      {!account.userId && account.ready ? (
        <p className="mt-1 text-xs text-muted-foreground">
          <Link to="/auth" className="text-primary">Sign in</Link> to rate this title.
        </p>
      ) : null}
    </div>
  );
}
