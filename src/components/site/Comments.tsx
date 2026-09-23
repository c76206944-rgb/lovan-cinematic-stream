import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/use-account";

type Comment = { id: string; user_id: string; author_name: string; body: string; created_at: string };

export function Comments({ titleId }: { titleId: string }) {
  const account = useAccount();
  const [items, setItems] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("title_comments")
      .select("id, user_id, author_name, body, created_at")
      .eq("title_id", titleId)
      .order("created_at", { ascending: false })
      .limit(100);
    setItems((data ?? []) as Comment[]);
  }, [titleId]);

  useEffect(() => {
    void load();
  }, [load]);

  const post = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text || !account.userId) return;
    if (text.length > 1000) return setError("Comments can be up to 1000 characters.");
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from("title_comments").insert({
      title_id: titleId,
      user_id: account.userId,
      author_name: (account.email ?? "").split("@")[0] ?? "",
      body: text,
    });
    setBusy(false);
    if (err) return setError("Could not post your comment.");
    setBody("");
    void load();
  };

  const remove = async (id: string) => {
    await supabase.from("title_comments").delete().eq("id", id);
    void load();
  };

  return (
    <section className="mt-14 max-w-3xl">
      <h2 className="text-lg font-semibold text-foreground">Comments ({items.length})</h2>
      {account.userId ? (
        <form onSubmit={post} className="mt-4 space-y-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Share what you thought"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <button
            type="submit"
            disabled={busy || !body.trim()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Posting" : "Post comment"}
          </button>
        </form>
      ) : account.ready ? (
        <p className="mt-4 text-sm text-muted-foreground">
          <Link to="/auth" className="text-primary">Sign in</Link> to leave a comment.
        </p>
      ) : null}
      <ul className="mt-6 space-y-4">
        {items.map((c) => (
          <li key={c.id} className="border-b border-border pb-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                <span className="text-foreground">{c.author_name || "Viewer"}</span> ·{" "}
                {new Date(c.created_at).toLocaleDateString()}
              </p>
              {account.userId === c.user_id || account.staff ? (
                <button type="button" onClick={() => void remove(c.id)} className="text-xs text-muted-foreground hover:text-foreground">
                  Delete
                </button>
              ) : null}
            </div>
            <p className="mt-1 whitespace-pre-line text-sm text-foreground">{c.body}</p>
          </li>
        ))}
        {items.length === 0 ? <li className="text-sm text-muted-foreground">No comments yet.</li> : null}
      </ul>
    </section>
  );
}
