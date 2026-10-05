import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AdminTabs, StaffGate } from "@/components/site/AdminTabs";
import { useAccount } from "@/lib/use-account";

export const Route = createFileRoute("/_authenticated/admin_/requests")({
  head: () => ({
    meta: [
      { title: "Viewer requests | LOVAN Studio" },
      { name: "description", content: "Titles viewers have asked LOVAN to add." },
      { property: "og:title", content: "Viewer requests | LOVAN Studio" },
      { property: "og:description", content: "Titles viewers have asked LOVAN to add." },
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RequestsInbox,
});

type Req = { id: string; title_name: string; kind: string; year: string; notes: string; status: string; created_at: string };
const statuses = ["pending", "acquired", "dismissed"] as const;

function RequestsInbox() {
  const account = useAccount();
  const [rows, setRows] = useState<Req[]>([]);
  const [filter, setFilter] = useState<string>("pending");

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("title_requests")
      .select("id, title_name, kind, year, notes, status, created_at")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as Req[]);
  }, []);

  useEffect(() => {
    if (account.staff) void load();
  }, [account.staff, load]);

  const setStatus = async (id: string, status: string) => {
    await supabase.from("title_requests").update({ status }).eq("id", id);
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
  };

  const shown = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  return (
    <StaffGate ready={account.ready} staff={account.staff} email={account.email}>
      <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold text-foreground">Studio</h1>
        <div className="mt-6"><AdminTabs /></div>
        <div className="mt-6 flex flex-wrap gap-2">
          {["pending", "acquired", "dismissed", "all"].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-md border px-3 py-1.5 text-sm capitalize ${filter === f ? "border-primary text-foreground" : "border-border text-muted-foreground"}`}
            >
              {f} ({f === "all" ? rows.length : rows.filter((r) => r.status === f).length})
            </button>
          ))}
        </div>
        {shown.length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">No requests here.</p>
        ) : (
          <ul className="mt-6 divide-y divide-border rounded-lg border border-border">
            {shown.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {r.title_name}{r.year ? ` (${r.year})` : ""} <span className="text-muted-foreground">· {r.kind === "series" ? "Series" : "Movie"}</span>
                  </p>
                  {r.notes ? <p className="mt-1 text-xs text-muted-foreground">{r.notes}</p> : null}
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  {statuses.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(r.id, s)}
                      className={`rounded-md border px-3 py-1.5 text-xs capitalize ${r.status === s ? "border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </StaffGate>
  );
}
