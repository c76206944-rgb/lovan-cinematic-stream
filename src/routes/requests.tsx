import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeading } from "@/components/site/TitleGrid";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/use-account";

export const Route = createFileRoute("/requests")({
  head: () => ({
    meta: [
      { title: "Request a film or series | LOVAN" },
      { name: "description", content: "Tell LOVAN which films and series you want to watch next." },
      { property: "og:title", content: "Request a film or series | LOVAN" },
      { property: "og:description", content: "Ask for the titles you want on LOVAN." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RequestsPage,
});

type Req = { id: string; title_name: string; kind: string; year: string; status: string; created_at: string };

const input = "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary";

function RequestsPage() {
  const account = useAccount();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"movie" | "series">("movie");
  const [year, setYear] = useState("");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState<Req[]>([]);

  const load = useCallback(async () => {
    if (!account.userId) return;
    const { data } = await supabase
      .from("title_requests")
      .select("id, title_name, kind, year, status, created_at")
      .eq("user_id", account.userId)
      .order("created_at", { ascending: false });
    setMine((data ?? []) as Req[]);
  }, [account.userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account.userId || !name.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("title_requests").insert({
      user_id: account.userId,
      title_name: name.trim().slice(0, 200),
      kind,
      year: year.trim().slice(0, 4),
      notes: notes.trim().slice(0, 1000),
    });
    setBusy(false);
    if (error) return setMsg("Could not send your request.");
    setMsg("Request sent. Thank you.");
    setName("");
    setYear("");
    setNotes("");
    void load();
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <PageHeading title="Request a title" description="Tell us a film or series you want to watch. We add titles when we can get the rights." />
      {!account.ready ? null : !account.userId ? (
        <p className="text-sm text-muted-foreground">
          <Link to="/auth" className="text-primary">Sign in</Link> to make a request.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="flex gap-2">
            {(["movie", "series"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`rounded-md border px-4 py-2 text-sm ${kind === k ? "border-primary text-foreground" : "border-border text-muted-foreground"}`}
              >
                {k === "movie" ? "Movie" : "Series"}
              </button>
            ))}
          </div>
          <input required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} placeholder="Title name" className={input} />
          <input maxLength={4} inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))} placeholder="Year (optional)" className={input} />
          <textarea maxLength={1000} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything that helps us find it (optional)" className={input} />
          {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
          <button type="submit" disabled={busy} className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
            {busy ? "Sending" : "Send request"}
          </button>
        </form>
      )}
      {mine.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-base font-semibold text-foreground">Your requests</h2>
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
            {mine.map((r) => (
              <li key={r.id} className="flex justify-between p-3 text-sm">
                <span className="text-foreground">{r.title_name} {r.year ? `(${r.year})` : ""}</span>
                <span className="capitalize text-muted-foreground">{r.status}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
