import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/use-account";
import { AdminTabs, StaffGate } from "@/components/site/AdminTabs";
import { useCatalog } from "@/lib/use-catalog";
import { collapseSeries } from "@/data/titles";
import type { Collection } from "@/lib/viewer";

export const Route = createFileRoute("/_authenticated/admin_/lists")({
  head: () => ({
    meta: [
      { title: "Studio lists | LOVAN" },
      { name: "description", content: "Create labelled lists and choose the home banner titles." },
      { property: "og:title", content: "Studio lists | LOVAN" },
      { property: "og:description", content: "Create labelled lists and choose the home banner titles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ListsPage,
});

const btn = "rounded-md border border-border px-3 py-1.5 text-xs text-foreground hover:border-primary disabled:opacity-40";

function ListsPage() {
  const account = useAccount();
  const qc = useQueryClient();
  const { titles } = useCatalog();
  const pool = collapseSeries(titles);
  const q = useQuery({
    queryKey: ["collections", "studio"],
    enabled: account.staff,
    queryFn: async () => {
      const { data } = await supabase.from("collections").select("*").order("position");
      return (data ?? []) as Collection[];
    },
  });
  const lists = q.data ?? [];
  const [label, setLabel] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["collections"] })]);
  const update = async (id: string, patch: Partial<Collection>) => {
    const { error } = await supabase.from("collections").update(patch).eq("id", id);
    setMsg(error ? error.message : null);
    await refresh();
  };
  const add = async (placement: "hero" | "rail") => {
    const name = placement === "hero" ? "Home banner" : label.trim();
    if (!name) return setMsg("Give the list a name, like Trending or Top ten.");
    const { error } = await supabase.from("collections").insert({ label: name, placement, position: lists.length });
    setMsg(error ? error.message : null);
    setLabel("");
    await refresh();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this list? The titles stay in the catalogue.")) return;
    await supabase.from("collections").delete().eq("id", id);
    await refresh();
  };
  const swap = async (i: number, j: number) => {
    const a = lists[i], b = lists[j];
    if (!a || !b) return;
    await supabase.from("collections").update({ position: j }).eq("id", a.id);
    await supabase.from("collections").update({ position: i }).eq("id", b.id);
    await refresh();
  };
  const hasHero = lists.some((l) => l.placement === "hero");

  return (
    <StaffGate ready={account.ready} staff={account.staff} email={account.email}>
      <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold text-foreground">Studio</h1>
        <div className="mt-6"><AdminTabs /></div>
        <p className="mt-6 max-w-2xl text-sm text-muted-foreground">
          Make labelled rows for Home such as Trending, Top ten or Romance, and pick which titles appear in the big banner. Rows show on Home in this order.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="List name, e.g. Top ten" className="min-w-[220px] rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
          <button type="button" className={btn} onClick={() => void add("rail")}>Add list</button>
          {!hasHero ? <button type="button" className={btn} onClick={() => void add("hero")}>Add home banner</button> : null}
        </div>
        {msg ? <p className="mt-2 text-xs text-destructive">{msg}</p> : null}

        <div className="mt-8 space-y-6">
          {lists.map((l, i) => (
            <ListEditor key={l.id} list={l} pool={pool} first={i === 0} last={i === lists.length - 1}
              onUp={() => void swap(i, i - 1)} onDown={() => void swap(i, i + 1)}
              onChange={(p) => void update(l.id, p)} onDelete={() => void remove(l.id)} />
          ))}
          {lists.length === 0 && !q.isLoading ? <p className="text-sm text-muted-foreground">No lists yet.</p> : null}
        </div>
      </div>
    </StaffGate>
  );
}

function ListEditor(props: {
  list: Collection; pool: ReturnType<typeof collapseSeries>; first: boolean; last: boolean;
  onUp: () => void; onDown: () => void; onChange: (p: Partial<Collection>) => void; onDelete: () => void;
}) {
  const { list, pool } = props;
  const [name, setName] = useState(list.label);
  const [pick, setPick] = useState("");
  const chosen = list.title_ids.map((id) => pool.find((t) => t.id === id)).filter(Boolean) as typeof pool;
  const move = (i: number, d: number) => {
    const ids = [...list.title_ids];
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    props.onChange({ title_ids: ids });
  };
  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wider text-primary">{list.placement === "hero" ? "Home banner" : "Row"}</span>
        <input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && name !== list.label && props.onChange({ label: name.trim() })}
          className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground" />
        <button type="button" className={btn} disabled={props.first} onClick={props.onUp}>Up</button>
        <button type="button" className={btn} disabled={props.last} onClick={props.onDown}>Down</button>
        <button type="button" className={btn} onClick={() => props.onChange({ published: !list.published })}>{list.published ? "Hide" : "Show"}</button>
        <button type="button" className={btn} onClick={props.onDelete}>Delete</button>
      </div>
      <ol className="mt-4 space-y-1">
        {chosen.map((t, i) => (
          <li key={t.id} className="flex items-center gap-2 text-sm text-foreground">
            <span className="w-6 text-xs text-muted-foreground">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate">{t.kind === "series" ? t.seriesName || t.name : t.name}</span>
            <button type="button" className={btn} onClick={() => move(i, -1)} disabled={i === 0}>Up</button>
            <button type="button" className={btn} onClick={() => move(i, 1)} disabled={i === chosen.length - 1}>Down</button>
            <button type="button" className={btn} onClick={() => props.onChange({ title_ids: list.title_ids.filter((x) => x !== t.id) })}>Remove</button>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex gap-2">
        <select value={pick} onChange={(e) => setPick(e.target.value)} className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground">
          <option value="">Choose a title to add</option>
          {pool.filter((t) => !list.title_ids.includes(t.id)).map((t) => (
            <option key={t.id} value={t.id}>{t.kind === "series" ? t.seriesName || t.name : t.name}</option>
          ))}
        </select>
        <button type="button" className={btn} disabled={!pick} onClick={() => { props.onChange({ title_ids: [...list.title_ids, pick] }); setPick(""); }}>Add</button>
      </div>
    </section>
  );
}
