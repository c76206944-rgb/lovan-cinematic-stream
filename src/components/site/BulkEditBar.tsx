import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { seriesGroups, type SeriesRow } from "@/lib/series-selection";
import { useServerFn } from "@tanstack/react-start";
import { bulkUpdateTitles } from "@/lib/catalog.functions";
import { describeTitle } from "@/lib/metadata.functions";

type Tri = "" | "yes" | "no";
type RowLite = SeriesRow & { name: string };

const input = "w-full min-w-0 rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary";

/** Bar for changing many selected titles at once. Empty fields are left unchanged. */
export function BulkEditBar(props: {
  rows: RowLite[];
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
  onDone: (text: string, error: boolean) => void;
  onDelete?: (() => void) | undefined;
}) {
  const run = useServerFn(bulkUpdateTitles);
  const enrich = useServerFn(describeTitle);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState("");
  const [f, setF] = useState({ series_name: "", season: "", genres: "", country: "", language: "", maturity: "", year: "", premium: "" as Tri, offline: "" as Tri, status: "" });
  const set = (k: keyof typeof f, v: string) => setF((c) => ({ ...c, [k]: v }));

  const [hidePublished, setHidePublished] = useState(true);
  const [hidden, setHidden] = useState<string[]>([]);
  const [chosenSeries, setChosenSeries] = useState("");
  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem("lovan-hidden-series") || "[]"); if (Array.isArray(saved)) setHidden(saved.filter((v): v is string => typeof v === "string")); } catch { /* ignore invalid preferences */ }
  }, []);
  const groups = seriesGroups(props.rows);
  const available = groups.filter((g) => !hidden.includes(g.key) && (!hidePublished || !g.published));
  const hideChosen = () => {
    if (!chosenSeries) return;
    const next = [...hidden, chosenSeries];
    setHidden(next); setChosenSeries("");
    try { localStorage.setItem("lovan-hidden-series", JSON.stringify(next)); } catch { /* device storage unavailable */ }
  };
  const n = props.selected.size;

  const suggest = async () => {
    const first = props.rows.find((r) => props.selected.has(r.id));
    if (!first) return;
    setAiBusy(true);
    setAiNote("");
    try {
      const res = await enrich({
        data: {
          name: first.series_name || first.name,
          kind: first.kind === "series" ? "series" : "movie",
          notes: props.rows.filter((r) => props.selected.has(r.id)).map((r) => r.name).slice(0, 20).join("\n"),
          outputLanguage: "English",
        },
      });
      const pick = (key: string) => res.suggestions.find((s) => s.key === key && s.value.trim())?.value ?? "";
      const next = { genres: pick("genres"), country: pick("country"), language: pick("language"), maturity: pick("maturity"), year: pick("year") };
      setF((c) => ({ ...c, ...Object.fromEntries(Object.entries(next).filter(([, v]) => v)) }));
      const filled = Object.values(next).filter(Boolean).length;
      setAiNote(filled ? `Filled ${filled} fields. Check them, then apply.` : "The AI could not confirm anything.");
      setOpen(true);
    } catch (e) {
      setAiNote(e instanceof Error ? e.message : "The AI could not be reached.");
    } finally {
      setAiBusy(false);
    }
  };


  const toggleSeries = (name: string) => {
    const ids = groups.find((g) => g.key === name)?.ids ?? [];
    const next = new Set(props.selected);
    const all = ids.every((id) => next.has(id));
    ids.forEach((id) => (all ? next.delete(id) : next.add(id)));
    props.setSelected(next);
  };

  const apply = async () => {
    const fields: Record<string, unknown> = {};
    if (f.series_name.trim()) fields["series_name"] = f.series_name.trim();
    if (f.season) fields["season"] = Number(f.season);
    const g = f.genres.split(",").map((s) => s.trim()).filter(Boolean);
    if (g.length) fields["add_genres"] = g.slice(0, 3);
    if (f.country.trim()) fields["country"] = f.country.trim();
    if (f.language.trim()) fields["language"] = f.language.trim();
    if (f.maturity.trim()) fields["maturity"] = f.maturity.trim();
    if (f.year) fields["year"] = Number(f.year);
    if (f.premium) fields["premium"] = f.premium === "yes";
    if (f.offline) fields["offline_allowed"] = f.offline === "yes";
    if (f.status === "publish") fields["published"] = true;
    if (f.status === "unpublish") fields["published"] = false;
    if (f.status === "archive") fields["archived"] = true;
    if (f.status === "restore") fields["archived"] = false;
    if (!Object.keys(fields).length) return props.onDone("Choose at least one change.", true);
    setBusy(true);
    try {
      const res = await run({ data: { ids: [...props.selected], fields } });
      props.onDone(`Updated ${res.updated} titles.${res.noVideo ? ` ${res.noVideo} stayed as drafts because they have no video.` : ""}`, false);
      props.setSelected(new Set());
      setOpen(false);
    } catch (e) {
      props.onDone(e instanceof Error ? e.message : "Bulk edit failed.", true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-foreground">{n} selected</span>
        <button type="button" disabled={!n} onClick={() => setOpen(!open)} className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground disabled:opacity-50">{open ? "Close editor" : "Edit selected"}</button>
        <button type="button" disabled={!n || aiBusy} onClick={() => void suggest()} className="rounded-md border border-primary px-3 py-1.5 text-primary disabled:opacity-50">{aiBusy ? "Asking AI" : "Suggest with AI"}</button>
        {n ? <button type="button" onClick={() => props.setSelected(new Set())} className="text-muted-foreground">Clear</button> : null}
        {props.onDelete ? <Button size="sm" variant="destructive" disabled={!n || busy} onClick={props.onDelete}>Delete selected</Button> : null}
        {aiNote ? <span className="text-xs text-muted-foreground">{aiNote}</span> : null}
      </div>

      {groups.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select aria-label="Select whole series" className={`${input} max-w-sm`} value={chosenSeries} onChange={(e) => setChosenSeries(e.target.value)}>
            <option value="">Select whole series</option>
            {available.map((g) => <option key={g.key} value={g.key}>{g.name} ({g.ids.length})</option>)}
          </select>
          <Button size="sm" variant="outline" disabled={!chosenSeries} onClick={() => toggleSeries(chosenSeries)}>Select / clear</Button>
          <Button size="sm" variant="ghost" disabled={!chosenSeries} onClick={hideChosen}>Hide name</Button>
          <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={hidePublished} onChange={(e) => { setHidePublished(e.target.checked); setChosenSeries(""); }} />Hide published series</label>
          {hidden.length ? <Button size="sm" variant="ghost" onClick={() => { setHidden([]); try { localStorage.removeItem("lovan-hidden-series"); } catch { /* ignore */ } }}>Restore hidden names</Button> : null}
        </div>
      ) : null}
      {open && n ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-4">Empty fields stay as they are. Series name and season only change episodes.</p>
          <input className={input} placeholder="Series name" value={f.series_name} onChange={(e) => set("series_name", e.target.value)} />
          <input className={input} placeholder="Season" inputMode="numeric" value={f.season} onChange={(e) => set("season", e.target.value.replace(/\D/g, ""))} />
          <input className={input} placeholder="Add genres, comma separated" value={f.genres} onChange={(e) => set("genres", e.target.value)} />
          <input className={input} placeholder="Country" value={f.country} onChange={(e) => set("country", e.target.value)} />
          <input className={input} placeholder="Language" value={f.language} onChange={(e) => set("language", e.target.value)} />
          <input className={input} placeholder="Maturity, e.g. 16+" value={f.maturity} onChange={(e) => set("maturity", e.target.value)} />
          <input className={input} placeholder="Year" inputMode="numeric" value={f.year} onChange={(e) => set("year", e.target.value.replace(/\D/g, ""))} />
          <select className={input} value={f.premium} onChange={(e) => set("premium", e.target.value)}>
            <option value="">Premium: no change</option><option value="yes">Premium only</option><option value="no">Free to watch</option>
          </select>
          <select className={input} value={f.offline} onChange={(e) => set("offline", e.target.value)}>
            <option value="">Offline: no change</option><option value="yes">Allow offline</option><option value="no">No offline</option>
          </select>
          <select className={input} value={f.status} onChange={(e) => set("status", e.target.value)}>
            <option value="">Status: no change</option><option value="publish">Publish</option><option value="unpublish">Unpublish</option><option value="archive">Archive</option><option value="restore">Restore</option>
          </select>
          <button type="button" disabled={busy} onClick={() => void apply()} className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50">
            {busy ? "Saving" : `Apply to ${n} titles`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
