import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listSubtitleTracks,
  removeSubtitleTrack,
  saveSubtitleTrack,
  translateSubtitleTrack,
  type StoredTrack,
} from "@/lib/subtitles.functions";

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

/** Subtitle files for one title: add a file, translate it, or remove a language. */
export function SubtitleManager({ titleId }: { titleId: string }) {
  const list = useServerFn(listSubtitleTracks);
  const save = useServerFn(saveSubtitleTrack);
  const remove = useServerFn(removeSubtitleTrack);
  const translate = useServerFn(translateSubtitleTrack);

  const [tracks, setTracks] = useState<StoredTrack[]>([]);
  const [uploadLang, setUploadLang] = useState("en");
  const [fromLang, setFromLang] = useState("");
  const [toLang, setToLang] = useState("sw");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    void list({ data: { id: titleId } })
      .then((rows) => {
        setTracks(rows);
        setFromLang(rows[0]?.lang ?? "");
      })
      .catch(() => setTracks([]));
  }, [titleId, list]);

  const labelOf = (code: string) => LANGUAGES.find((l) => l.code === code)?.label ?? code;

  const run = async (work: () => Promise<StoredTrack[]>, done: string) => {
    setBusy(true);
    setNote(null);
    try {
      const rows = await work();
      setTracks(rows);
      if (!fromLang && rows[0]) setFromLang(rows[0].lang);
      setNote(done);
    } catch (cause) {
      setNote(cause instanceof Error ? cause.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  };

  const chooseFile = async (file: File) => {
    const text = await file.text();
    await run(
      () => save({ data: { id: titleId, lang: uploadLang, label: labelOf(uploadLang), vtt: text } }),
      `${labelOf(uploadLang)} subtitles saved.`,
    );
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
                onClick={() => void run(() => remove({ data: { id: titleId, lang: t.lang } }), `${t.label} removed.`)}
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

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-muted-foreground">
          Add a subtitle file
          <select
            value={uploadLang}
            onChange={(e) => setUploadLang(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
          <input
            type="file"
            accept=".vtt,.srt,text/vtt"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void chooseFile(file);
            }}
            className="mt-2 block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-xs file:text-foreground"
          />
        </label>

        <div className="text-xs text-muted-foreground">
          Translate with AI
          <div className="mt-1 flex gap-2">
            <select
              value={fromLang}
              onChange={(e) => setFromLang(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
            >
              {tracks.map((t) => (
                <option key={t.lang} value={t.lang}>{t.label}</option>
              ))}
            </select>
            <select
              value={toLang}
              onChange={(e) => setToLang(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={busy || !fromLang || fromLang === toLang}
            onClick={() =>
              void run(
                () => translate({ data: { id: titleId, fromLang, toLang, toLabel: labelOf(toLang) } }),
                `${labelOf(toLang)} subtitles created.`,
              )
            }
            className="mt-2 rounded-md border border-border px-3 py-1.5 text-sm text-foreground disabled:opacity-50"
          >
            {busy ? "Working" : "Translate"}
          </button>
        </div>
      </div>

      {note ? <p className="mt-2 text-xs text-primary">{note}</p> : null}
    </div>
  );
}
