import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  fetchOnlineSubtitle,
  listSubtitleTracks,
  removeSubtitleTrack,
  saveSubtitleTrack,
  searchSubtitlesOnline,
  translateSubtitleTrack,
  type StoredTrack,
  type SubtitleMatch,
} from "@/lib/subtitles.functions";
import { readSubtitleFile } from "@/lib/subtitle-file";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
  { code: "es", label: "Spanish" },
  { code: "pt", label: "Portuguese" },
  { code: "ar", label: "Arabic" },
  { code: "sw", label: "Swahili" },
  { code: "lg", label: "Luganda" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "hi", label: "Hindi" },
  { code: "zh", label: "Chinese" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "ru", label: "Russian" },
  { code: "tr", label: "Turkish" },
];

type Search = { query: string; year: number | null; season: number | null; episode: number | null };

const field = "rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground";
const btn = "rounded-md border border-border px-3 py-1.5 text-sm text-foreground disabled:opacity-50";

/** Subtitle files for one title: find online, add a file, translate to English, or remove. */
export function SubtitleManager({ titleId, search }: { titleId: string; search: Search }) {
  const list = useServerFn(listSubtitleTracks);
  const save = useServerFn(saveSubtitleTrack);
  const remove = useServerFn(removeSubtitleTrack);
  const translate = useServerFn(translateSubtitleTrack);
  const findOnline = useServerFn(searchSubtitlesOnline);
  const fetchOne = useServerFn(fetchOnlineSubtitle);

  const [tracks, setTracks] = useState<StoredTrack[]>([]);
  const [uploadLang, setUploadLang] = useState("en");
  const [fromLang, setFromLang] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const [q, setQ] = useState(search);
  const [matches, setMatches] = useState<SubtitleMatch[] | null>(null);
  const [preview, setPreview] = useState<{ release: string; text: string } | null>(null);

  useEffect(() => setQ(search), [search.query, search.year, search.season, search.episode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void list({ data: { id: titleId } })
      .then((rows) => {
        setTracks(rows);
        setFromLang(rows.find((r) => r.lang !== "en")?.lang ?? "");
      })
      .catch(() => setTracks([]));
  }, [titleId, list]);

  const labelOf = (code: string) => LANGUAGES.find((l) => l.code === code)?.label ?? code;
  const others = tracks.filter((t) => t.lang !== "en");

  const work = async <T,>(fn: () => Promise<T>, done?: string): Promise<T | undefined> => {
    setBusy(true);
    setNote(null);
    try {
      const out = await fn();
      if (done) setNote(done);
      return out;
    } catch (cause) {
      setNote(cause instanceof Error ? cause.message : "That did not work.");
      return undefined;
    } finally {
      setBusy(false);
    }
  };

  const store = async (lang: string, text: string, done: string) => {
    const rows = await work(() => save({ data: { id: titleId, lang, label: labelOf(lang), vtt: text } }), done);
    if (rows) setTracks(rows);
    return Boolean(rows);
  };

  const chooseFile = async (file: File) => {
    const text = await work(() => readSubtitleFile(file));
    if (text) await store(uploadLang, text, `${labelOf(uploadLang)} subtitles saved.`);
  };

  const runSearch = async () => {
    setPreview(null);
    const rows = await work(() => findOnline({ data: q }));
    if (rows) setMatches(rows);
  };

  const review = async (m: SubtitleMatch) => {
    const out = await work(() => fetchOne({ data: { fileId: m.fileId } }));
    if (out) setPreview({ release: m.release, text: out.text });
  };

  return (
    <div className="sm:col-span-2 rounded-md border border-border p-3">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">Subtitles</span>

      {tracks.length ? (
        <ul className="mt-2 space-y-1">
          {tracks.map((t) => (
            <li key={t.lang} className="flex items-center justify-between gap-3 text-sm text-foreground">
              <span>{t.label}</span>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  const rows = await work(() => remove({ data: { id: titleId, lang: t.lang } }), `${t.label} removed.`);
                  if (rows) setTracks(rows);
                }}
                className="text-xs text-muted-foreground underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">No subtitles yet.</p>
      )}

      <div className="mt-4 rounded-md border border-border p-3">
        <p className="text-xs text-muted-foreground">Find English subtitles online (OpenSubtitles)</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_5rem_4rem_4rem_auto]">
          <input className={field} value={q.query} onChange={(e) => setQ({ ...q, query: e.target.value })} placeholder="Title" />
          <input className={field} inputMode="numeric" value={q.year ?? ""} onChange={(e) => setQ({ ...q, year: Number(e.target.value) || null })} placeholder="Year" />
          <input className={field} inputMode="numeric" value={q.season ?? ""} onChange={(e) => setQ({ ...q, season: Number(e.target.value) || null })} placeholder="S" />
          <input className={field} inputMode="numeric" value={q.episode ?? ""} onChange={(e) => setQ({ ...q, episode: Number(e.target.value) || null })} placeholder="E" />
          <button type="button" className={btn} disabled={busy || !q.query.trim()} onClick={() => void runSearch()}>
            {busy ? "Working" : "Search"}
          </button>
        </div>

        {matches && !preview ? (
          matches.length ? (
            <ul className="mt-3 max-h-64 divide-y divide-border overflow-y-auto rounded-md border border-border">
              {matches.map((m) => (
                <li key={m.fileId} className="flex items-center justify-between gap-3 px-3 py-2 text-xs text-foreground">
                  <span className="min-w-0 break-words">
                    {m.release}
                    <span className="ml-2 text-muted-foreground">{m.downloads.toLocaleString()} downloads{m.hearingImpaired ? ", hearing impaired" : ""}</span>
                  </span>
                  <button type="button" className={btn} disabled={busy} onClick={() => void review(m)}>Review</button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">No matches. Try removing the year or check the title spelling.</p>
          )
        ) : null}

        {preview ? (
          <div className="mt-3">
            <p className="text-xs text-foreground">{preview.release}</p>
            <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-background p-2 text-xs text-muted-foreground">
              {preview.text.slice(0, 2500)}
            </pre>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className={btn}
                disabled={busy}
                onClick={async () => {
                  if (await store("en", preview.text, "English subtitles attached.")) {
                    setPreview(null);
                    setMatches(null);
                  }
                }}
              >
                Attach as English
              </button>
              <button type="button" className={btn} disabled={busy} onClick={() => setPreview(null)}>Back to results</button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">
          Add a subtitle file (.srt, .vtt or .zip)
          <select value={uploadLang} onChange={(e) => setUploadLang(e.target.value)} className={`mt-1 w-full ${field}`}>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
          <input
            type="file"
            accept=".vtt,.srt,.zip,text/vtt,application/zip"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void chooseFile(file);
              e.target.value = "";
            }}
            className="mt-2 block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-xs file:text-foreground"
          />
        </label>

        <div className="text-xs text-muted-foreground">
          Translate to English with AI
          <select value={fromLang} onChange={(e) => setFromLang(e.target.value)} className={`mt-1 w-full ${field}`}>
            {others.length ? null : <option value="">Add a non-English file first</option>}
            {others.map((t) => (
              <option key={t.lang} value={t.lang}>From {t.label}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy || !fromLang}
            onClick={async () => {
              const rows = await work(
                () => translate({ data: { id: titleId, fromLang, toLang: "en", toLabel: "English" } }),
                "English subtitles created.",
              );
              if (rows) setTracks(rows);
            }}
            className={`mt-2 ${btn}`}
          >
            {busy ? "Working" : "Translate to English"}
          </button>
        </div>
      </div>

      {note ? <p className="mt-2 text-xs text-primary">{note}</p> : null}
    </div>
  );
}
