import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AdminTabs, StaffGate } from "@/components/site/AdminTabs";
import { useAccount } from "@/lib/use-account";

export const Route = createFileRoute("/_authenticated/admin_/announcements")({
  head: () => ({
    meta: [
      { title: "Announcements | LOVAN Studio" },
      { name: "description", content: "Post and remove messages every LOVAN viewer sees." },
      { property: "og:title", content: "Announcements | LOVAN Studio" },
      { property: "og:description", content: "Post and remove messages every LOVAN viewer sees." },
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnnouncementsPage,
});

type Row = { id: string; body: string; created_at: string };

function AnnouncementsPage() {
  const account = useAccount();
  const [rows, setRows] = useState<Row[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("site_announcements").select("id, body, created_at").order("created_at", { ascending: false });
    setRows((data ?? []) as Row[]);
  }, []);

  useEffect(() => {
    if (account.staff) void load();
  }, [account.staff, load]);

  const post = async () => {
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from("site_announcements").insert({ body, created_by: account.userId ?? null });
    setBusy(false);
    if (error) return setErr("Could not post. Try again.");
    setText("");
    void load();
  };

  const remove = async (id: string) => {
    await supabase.from("site_announcements").delete().eq("id", id);
    void load();
  };

  return (
    <StaffGate ready={account.ready} staff={account.staff} email={account.email}>
      <div className="mx-auto max-w-[1000px] px-4 py-10 sm:px-6">
        <h1 className="mb-6 text-2xl font-semibold text-foreground">Announcements</h1>
        <AdminTabs />
        <div className="mt-6 space-y-3">
          <p className="text-sm text-muted-foreground">Your message appears under the top bar on every page for all viewers. The newest three show at once.</p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={400}
            rows={3}
            placeholder="Example: New episodes of Good Boy are up tonight."
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
          {err ? <p className="text-sm text-primary">{err}</p> : null}
          <button type="button" disabled={busy || !text.trim()} onClick={() => void post()} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
            {busy ? "Posting" : "Post announcement"}
          </button>
        </div>
        <ul className="mt-8 divide-y divide-border rounded-lg border border-border">
          {rows.length === 0 ? <li className="p-4 text-sm text-muted-foreground">No announcements live.</li> : null}
          {rows.map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-4 p-4">
              <div className="min-w-0">
                <p className="whitespace-pre-line break-words text-sm text-foreground">{r.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
              </div>
              <button type="button" onClick={() => void remove(r.id)} className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm text-foreground">
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </StaffGate>
  );
}
