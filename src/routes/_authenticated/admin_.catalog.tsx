import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/use-account";
import { AdminTabs, StaffGate } from "@/components/site/AdminTabs";
import { BulkEditBar } from "@/components/site/BulkEditBar";
import { PosterField } from "@/components/site/PosterField";
import { deleteTitle, saveTitle, setTitleStatus } from "@/lib/catalog.functions";

export const Route = createFileRoute("/_authenticated/admin_/catalog")({
  validateSearch: (search: Record<string, unknown>): { edit?: string } =>
    typeof search["edit"] === "string" ? { edit: search["edit"] } : {},
  head: () => ({
    meta: [
      { title: "Catalogue editor | LOVAN" },
      { name: "description", content: "Edit, unpublish, archive and delete LOVAN titles." },
      { property: "og:title", content: "Catalogue editor | LOVAN" },
      { property: "og:description", content: "Edit, unpublish, archive and delete LOVAN titles." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CatalogPage,
});

type Row = {
  id: string;
  name: string;
  kind: string;
  series_name: string;
  season: number | null;
  episode: number | null;
  episode_title: string;
  synopsis: string;
  genres: string[];
  cast_members: string[];
  director: string;
  country: string;
  language: string;
  runtime: string;
  maturity: string;
  year: number;
  premium: boolean;
  published: boolean;
  offline_allowed: boolean;
  archived: boolean;
  ad_enabled: boolean;
  ad_placements: string[];
  ad_cues: string;
  ad_notes: string;
  video_path: string | null;
  poster_url: string | null;
  updated_at: string;
};

type Filter = "all" | "published" | "draft" | "archived";

const inputClass =
  "mt-1.5 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary";
const labelClass = "text-xs uppercase tracking-wide text-muted-foreground";

function statusOf(r: Row) {
  if (r.archived) return "Archived";
  return r.published ? "Published" : "Draft";
}

function CatalogPage() {
  const account = useAccount();
  const search = Route.useSearch();
  const save = useServerFn(saveTitle);
  const setStatus = useServerFn(setTitleStatus);
  const remove = useServerFn(deleteTitle);

  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setSelected((cur) => { const n = new Set(cur); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("catalog_titles").select("*").order("updated_at", { ascending: false });
    setRows((data ?? []) as Row[]);
  }, []);

  useEffect(() => {
    if (account.staff) void load();
  }, [account.staff, load]);

  useEffect(() => {
    if (!search.edit || editing) return;
    const requested = rows.find((row) => row.id === search.edit);
    if (requested) setEditing(requested);
  }, [editing, rows, search.edit]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "published" && !(r.published && !r.archived)) return false;
      if (filter === "draft" && (r.published || r.archived)) return false;
      if (filter === "archived" && !r.archived) return false;
      if (q && !`${r.name} ${r.series_name}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, filter, query]);

  const run = async (id: string, work: () => Promise<unknown>, done: string) => {
    setBusy(id);
    setMessage(null);
    try {
      await work();
      setMessage({ text: done, error: false });
      await load();
    } catch (cause) {
      setMessage({ text: cause instanceof Error ? cause.message : "Something went wrong.", error: true });
    } finally {
      setBusy(null);
    }
  };

  const submitEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    const e = editing;
    await run(
      e.id,
      () =>
        save({
          data: {
            id: e.id,
            name: e.name,
            kind: e.kind === "series" ? "series" : "movie",
            series_name: e.series_name,
            season: e.season,
            episode: e.episode,
            episode_title: e.episode_title,
            synopsis: e.synopsis,
            genres: e.genres,
            cast_members: e.cast_members,
            director: e.director,
            country: e.country,
            language: e.language,
            runtime: e.runtime,
            maturity: e.maturity,
            year: e.year,
            premium: e.premium,
            published: e.published,
            offline_allowed: e.offline_allowed,
            ad_enabled: e.ad_enabled,
            ad_placements: e.ad_placements as ("pre_roll" | "mid_roll" | "post_roll" | "banner" | "sponsored_card")[],
            ad_cues: e.ad_cues,
            ad_notes: e.ad_notes,
            poster_url: e.poster_url,
            video_path: e.video_path,
          },
        }).then(() => setEditing(null)),
      "Changes saved.",
    );
  };

  const patch = (fields: Partial<Row>) => setEditing((cur) => (cur ? { ...cur, ...fields } : cur));
  const splitList = (value: string) => value.split(",").map((v) => v.trim()).filter(Boolean);

  return (
    <StaffGate ready={account.ready} staff={account.staff} email={account.email}>
      <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold text-foreground">Studio</h1>
        <div className="mt-4">
          <AdminTabs />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <input
            className="w-64 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            placeholder="Search by name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex gap-1 rounded-md border border-border p-1">
            {(["all", "published", "draft", "archived"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded px-3 py-1 text-sm capitalize ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {f}
              </button>
            ))}
          </div>
          <span className="text-sm text-muted-foreground">{visible.length} titles</span>
        </div>

        {message ? (
          <p className={`mt-4 text-sm ${message.error ? "text-primary" : "text-muted-foreground"}`}>{message.text}</p>
        ) : null}

        <BulkEditBar rows={rows} selected={selected} setSelected={setSelected} onDone={(text, error) => { setMessage({ text, error }); void load(); }} />

        <div className="mt-4 hidden overflow-x-auto rounded-lg border border-border md:block">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-4 py-3"><input type="checkbox" aria-label="Select all shown" checked={visible.length > 0 && visible.every((r) => selected.has(r.id))} onChange={(e) => setSelected(e.target.checked ? new Set([...selected, ...visible.map((r) => r.id)]) : new Set())} /></th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Genres</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-muted-foreground">No titles match.</td>
                </tr>
              ) : (
                visible.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3"><input type="checkbox" aria-label={`Select ${r.name}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} /></td>
                    <td className="px-4 py-3 text-foreground">{r.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.kind === "series" ? `${r.series_name || "Series"} S${r.season ?? "?"} E${r.episode ?? "?"}` : "Film"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.genres.join(", ") || "Not set"}</td>
                    <td className={`px-4 py-3 ${statusOf(r) === "Published" ? "text-primary" : "text-muted-foreground"}`}>{statusOf(r)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(r.updated_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <ActionButton disabled={busy === r.id} onClick={() => setEditing(r)}>Edit</ActionButton>
                        {r.archived ? (
                          <ActionButton disabled={busy === r.id} onClick={() => run(r.id, () => setStatus({ data: { id: r.id, action: "restore" } }), "Restored as a draft.")}>Restore</ActionButton>
                        ) : (
                          <>
                            {r.published ? (
                              <ActionButton disabled={busy === r.id} onClick={() => run(r.id, () => setStatus({ data: { id: r.id, action: "unpublish" } }), "Unpublished.")}>Unpublish</ActionButton>
                            ) : (
                              <ActionButton disabled={busy === r.id} onClick={() => run(r.id, () => setStatus({ data: { id: r.id, action: "publish" } }), "Published.")}>Publish</ActionButton>
                            )}
                            <ActionButton disabled={busy === r.id} onClick={() => run(r.id, () => setStatus({ data: { id: r.id, action: "archive" } }), "Archived.")}>Archive</ActionButton>
                          </>
                        )}
                        <ActionButton
                          danger
                          disabled={busy === r.id}
                          onClick={() => {
                            if (window.confirm(`Delete "${r.name}" and its files for good?`)) {
                              void run(r.id, () => remove({ data: { id: r.id } }), "Deleted.");
                            }
                          }}
                        >
                          Delete
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 space-y-3 md:hidden">
          {visible.length === 0 ? <p className="text-sm text-muted-foreground">No titles match.</p> : null}
          {visible.map((r) => (
            <article key={r.id} className="rounded-lg border border-border p-4">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <input type="checkbox" className="mt-1 shrink-0" aria-label={`Select ${r.name}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
                <div className="min-w-0 flex-1">
                  <h2 className="break-words text-sm font-medium text-foreground">{r.name}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.kind === "series" ? `${r.series_name || "Series"} S${r.season ?? "?"} E${r.episode ?? "?"}` : "Film"}
                  </p>
                </div>
                <span className={`shrink-0 text-xs ${statusOf(r) === "Published" ? "text-primary" : "text-muted-foreground"}`}>{statusOf(r)}</span>
              </div>
              <p className="mt-2 break-words text-xs text-muted-foreground">{r.genres.join(", ") || "Genres not set"}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <ActionButton disabled={busy === r.id} onClick={() => setEditing(r)}>Edit</ActionButton>
                {r.archived ? (
                  <ActionButton disabled={busy === r.id} onClick={() => run(r.id, () => setStatus({ data: { id: r.id, action: "restore" } }), "Restored as a draft.")}>Restore</ActionButton>
                ) : r.published ? (
                  <ActionButton disabled={busy === r.id} onClick={() => run(r.id, () => setStatus({ data: { id: r.id, action: "unpublish" } }), "Unpublished.")}>Unpublish</ActionButton>
                ) : (
                  <ActionButton disabled={busy === r.id} onClick={() => run(r.id, () => setStatus({ data: { id: r.id, action: "publish" } }), "Published.")}>Publish</ActionButton>
                )}
              </div>
            </article>
          ))}
        </div>

        {editing ? (
          <div className="fixed inset-0 z-50 flex justify-end bg-background/80" onClick={() => setEditing(null)}>
            <form
              onSubmit={submitEdit}
              onClick={(e) => e.stopPropagation()}
              className="h-full w-full max-w-xl overflow-y-auto border-l border-border bg-background p-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Edit title</h2>
                <button type="button" onClick={() => setEditing(null)} className="text-sm text-muted-foreground hover:text-foreground">Close</button>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <L label="Name" wide><input className={inputClass} value={editing.name} onChange={(e) => patch({ name: e.target.value })} /></L>
                {editing.kind === "series" ? (
                  <>
                    <L label="Series name" wide><input className={inputClass} value={editing.series_name} onChange={(e) => patch({ series_name: e.target.value })} /></L>
                    <L label="Season"><input className={inputClass} inputMode="numeric" value={editing.season ?? ""} onChange={(e) => patch({ season: e.target.value ? Number(e.target.value) : null })} /></L>
                    <L label="Episode"><input className={inputClass} inputMode="numeric" value={editing.episode ?? ""} onChange={(e) => patch({ episode: e.target.value ? Number(e.target.value) : null })} /></L>
                    <L label="Episode title" wide><input className={inputClass} value={editing.episode_title} onChange={(e) => patch({ episode_title: e.target.value })} /></L>
                  </>
                ) : null}
                <L label="Synopsis" wide><textarea className={`${inputClass} min-h-28`} value={editing.synopsis} onChange={(e) => patch({ synopsis: e.target.value })} /></L>
                <L label="Genres, comma separated"><input className={inputClass} defaultValue={editing.genres.join(", ")} onBlur={(e) => patch({ genres: splitList(e.target.value) })} /></L>
                <L label="Cast, comma separated"><input className={inputClass} defaultValue={editing.cast_members.join(", ")} onBlur={(e) => patch({ cast_members: splitList(e.target.value) })} /></L>
                <L label="Director"><input className={inputClass} value={editing.director} onChange={(e) => patch({ director: e.target.value })} /></L>
                <L label="Year"><input className={inputClass} inputMode="numeric" value={editing.year} onChange={(e) => patch({ year: Number(e.target.value) || 0 })} /></L>
                <L label="Country"><input className={inputClass} value={editing.country} onChange={(e) => patch({ country: e.target.value })} /></L>
                <L label="Language"><input className={inputClass} value={editing.language} onChange={(e) => patch({ language: e.target.value })} /></L>
                <L label="Runtime"><input className={inputClass} value={editing.runtime} onChange={(e) => patch({ runtime: e.target.value })} /></L>
                <L label="Maturity"><input className={inputClass} value={editing.maturity} onChange={(e) => patch({ maturity: e.target.value })} /></L>
                <L label="Mid roll cue points" wide><input className={inputClass} value={editing.ad_cues} onChange={(e) => patch({ ad_cues: e.target.value })} /></L>
                <PosterField posterPath={editing.poster_url} onChange={(path) => patch({ poster_url: path })} />
              </div>
              <div className="mt-5 space-y-3 text-sm text-foreground">
                <label className="flex items-center gap-3"><input type="checkbox" className="h-4 w-4 accent-[var(--color-primary)]" checked={editing.premium} onChange={(e) => patch({ premium: e.target.checked })} />Premium only</label>
                <label className="flex items-center gap-3"><input type="checkbox" className="h-4 w-4 accent-[var(--color-primary)]" checked={editing.ad_enabled} onChange={(e) => patch({ ad_enabled: e.target.checked })} />Show adverts to free viewers</label>
                <label className="flex items-center gap-3"><input type="checkbox" className="h-4 w-4 accent-[var(--color-primary)]" checked={editing.published} onChange={(e) => patch({ published: e.target.checked })} />Published</label>
                <label className="flex items-center gap-3"><input type="checkbox" className="h-4 w-4 accent-[var(--color-primary)]" checked={editing.offline_allowed} onChange={(e) => patch({ offline_allowed: e.target.checked })} />Approved for offline viewing</label>
              </div>
              <button type="submit" disabled={busy === editing.id} className="mt-6 w-full rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
                {busy === editing.id ? "Saving" : "Save changes"}
              </button>
              {message?.error ? <p className="mt-3 text-sm text-primary">{message.text}</p> : null}
            </form>
          </div>
        ) : null}
      </div>
    </StaffGate>
  );
}

function L(props: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${props.wide ? "sm:col-span-2" : ""}`}>
      <span className={labelClass}>{props.label}</span>
      {props.children}
    </label>
  );
}

function ActionButton(props: { children: React.ReactNode; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      className={`rounded-md border px-2.5 py-1 text-xs transition-colors disabled:opacity-50 ${
        props.danger ? "border-primary/60 text-primary hover:bg-primary/10" : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {props.children}
    </button>
  );
}
