import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeading } from "@/components/site/TitleGrid";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/removal-request")({
  head: () => ({
    meta: [
      { title: "Request removal of a title | LOVAN" },
      { name: "description", content: "Rights owners can ask LOVAN to take down a film or series." },
      { property: "og:title", content: "Request removal of a title | LOVAN" },
      { property: "og:description", content: "Takedown requests for rights owners and their agents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RemovalPage,
});

const input = "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary";
const RELS = [
  { v: "owner", l: "I own the rights" },
  { v: "authorized_agent", l: "I am authorized to act for the owner" },
  { v: "distributor", l: "I am the licensed distributor" },
  { v: "other", l: "Other" },
] as const;

function RemovalPage() {
  const [f, setF] = useState({
    full_name: "", email: "", organisation: "", relationship: "owner", title_name: "",
    title_url: "", proof: "", reason: "", signature: "",
  });
  const [goodFaith, setGoodFaith] = useState(false);
  const [accurate, setAccurate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((c) => ({ ...c, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return setError("Enter a valid email.");
    if (f.proof.trim().length < 20) return setError("Describe your proof of ownership in at least 20 characters.");
    if (f.reason.trim().length < 10) return setError("Tell us why the title should be removed.");
    if (!goodFaith || !accurate) return setError("You must confirm both statements.");
    setBusy(true);
    const { error: err } = await supabase.from("removal_requests").insert({
      ...Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim()])),
      relationship: f.relationship,
      good_faith: goodFaith,
      accurate,
    } as never);
    setBusy(false);
    if (err) return setError("Could not send the request. Check every required field.");
    setDone(true);
  };

  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <PageHeading title="Request received" description="We will review it and reply by email. Titles confirmed as infringing are taken down." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <PageHeading
        title="Request removal"
        description="If you own or represent the rights to a film or series on LOVAN and want it taken off, apply here. Every field marked required must be filled in."
      />
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full legal name (required)"><input required maxLength={120} value={f.full_name} onChange={set("full_name")} className={input} /></Field>
        <Field label="Email (required)"><input required type="email" maxLength={255} value={f.email} onChange={set("email")} className={input} /></Field>
        <Field label="Company or organisation"><input maxLength={200} value={f.organisation} onChange={set("organisation")} className={input} /></Field>
        <Field label="Your relationship to the title (required)">
          <select value={f.relationship} onChange={set("relationship")} className={input}>
            {RELS.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
          </select>
        </Field>
        <Field label="Title name (required)"><input required maxLength={200} value={f.title_name} onChange={set("title_name")} className={input} /></Field>
        <Field label="Link to the title on LOVAN"><input maxLength={500} value={f.title_url} onChange={set("title_url")} placeholder="https://" className={input} /></Field>
        <Field label="Proof of ownership (required)">
          <textarea required maxLength={3000} rows={4} value={f.proof} onChange={set("proof")} placeholder="Registration numbers, contracts, distribution agreements, or links to official records" className={input} />
        </Field>
        <Field label="Reason for removal (required)">
          <textarea required maxLength={3000} rows={3} value={f.reason} onChange={set("reason")} className={input} />
        </Field>
        <label className="flex gap-3 text-sm text-muted-foreground">
          <input type="checkbox" checked={goodFaith} onChange={(e) => setGoodFaith(e.target.checked)} className="mt-1" />
          I believe in good faith that this use of the title is not authorized by the rights owner or the law.
        </label>
        <label className="flex gap-3 text-sm text-muted-foreground">
          <input type="checkbox" checked={accurate} onChange={(e) => setAccurate(e.target.checked)} className="mt-1" />
          The information in this request is accurate, and I am the owner or authorized to act for the owner.
        </label>
        <Field label="Signature: type your full name (required)"><input required maxLength={120} value={f.signature} onChange={set("signature")} className={input} /></Field>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <button type="submit" disabled={busy} className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
          {busy ? "Sending" : "Submit removal request"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
