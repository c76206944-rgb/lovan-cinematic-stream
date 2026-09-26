/** Folder picking and recursive folder drops for bulk uploads. */

export type PickedFile = { file: File; path: string };

const VIDEO_EXT = ["mp4", "mkv", "webm", "mov", "avi", "m4v", "mpg", "mpeg", "ts", "m3u8", "wmv", "flv", "3gp", "ogv"];

export function isVideoFile(name: string) {
  const base = name.split("/").pop() || name;
  if (base.startsWith(".")) return false;
  const ext = base.includes(".") ? base.slice(base.lastIndexOf(".") + 1).toLowerCase() : "";
  return VIDEO_EXT.includes(ext);
}

/** Path a picked file came from, including folders when the browser reports them. */
export function relPath(file: File) {
  const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  return rel && rel.length > 0 ? rel : file.name;
}

type FsEntry = {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  fullPath: string;
  file: (cb: (f: File) => void, err?: (e: unknown) => void) => void;
  createReader: () => { readEntries: (cb: (e: FsEntry[]) => void, err?: (e: unknown) => void) => void };
};

function readAll(entry: FsEntry): Promise<FsEntry[]> {
  const reader = entry.createReader();
  const out: FsEntry[] = [];
  return new Promise((resolve) => {
    const step = () => {
      reader.readEntries((batch) => {
        if (!batch || batch.length === 0) return resolve(out);
        out.push(...batch);
        step();
      }, () => resolve(out));
    };
    step();
  });
}

async function walk(entry: FsEntry, prefix: string, out: PickedFile[]): Promise<void> {
  if (entry.isFile) {
    const file = await new Promise<File | null>((res) => entry.file((f) => res(f), () => res(null)));
    if (file && isVideoFile(file.name) && file.size > 0) {
      out.push({ file, path: prefix ? `${prefix}/${file.name}` : file.name });
    }
    return;
  }
  if (entry.isDirectory) {
    const children = await readAll(entry);
    const next = prefix ? `${prefix}/${entry.name}` : entry.name;
    for (const child of children) await walk(child, next, out);
  }
}

/** Collect every video inside dropped files and folders, including subfolders. */
export async function collectDropped(dt: DataTransfer): Promise<PickedFile[]> {
  const out: PickedFile[] = [];
  const items = dt.items ? Array.from(dt.items) : [];
  const entries = items
    .map((i) => (i.webkitGetAsEntry ? (i.webkitGetAsEntry() as unknown as FsEntry | null) : null))
    .filter((e): e is FsEntry => !!e);

  if (entries.length > 0) {
    for (const entry of entries) await walk(entry, "", out);
    if (out.length > 0) return out;
  }

  for (const file of Array.from(dt.files || [])) {
    if (isVideoFile(file.name) && file.size > 0) out.push({ file, path: relPath(file) });
  }
  return out;
}

const clean = (s: string) =>
  s.replace(/\.[^.]+$/, "").replace(/[._]+/g, " ").replace(/\s+/g, " ").trim();

const SEASON_FOLDER = /^(season|series|s)\s*0*(\d{1,2})$/i;

export type PathGuess = {
  kind: "movie" | "series";
  name: string;
  seriesName: string;
  season: number | null;
  episode: number | null;
};

/**
 * Read series name, season and episode from the file name, falling back to the
 * folder structure ("Show Name/Season 2/Episode 1.mp4").
 */
export function guessFromPath(path: string): PathGuess {
  const parts = path.split("/").filter(Boolean);
  const fileName = parts.pop() || path;
  const base = clean(fileName);

  const inName = base.match(/^(.*?)[\s-]*s(\d{1,2})\s*e(\d{1,3})/i);
  if (inName) {
    const series = (inName[1] ?? "").trim() || clean(parts[parts.length - 1] ?? "") || base;
    return {
      kind: "series",
      name: series,
      seriesName: series,
      season: Number(inName[2]),
      episode: Number(inName[3]),
    };
  }

  const folders = parts.map((p) => clean(p));
  const seasonIdx = folders.findIndex((f) => SEASON_FOLDER.test(f));
  if (seasonIdx >= 0) {
    const m = folders[seasonIdx]!.match(SEASON_FOLDER);
    const season = Number(m?.[2] ?? 1) || 1;
    const series = folders.slice(0, seasonIdx).pop() || base;
    const epNum = base.match(/(?:ep(?:isode)?\s*)?0*(\d{1,3})\s*$/i) ?? base.match(/\b0*(\d{1,3})\b/);
    return {
      kind: "series",
      name: series,
      seriesName: series,
      season,
      episode: epNum ? Number(epNum[1]) || 1 : 1,
    };
  }

  const epOnly = base.match(/^(.*?)[\s-]*(?:ep|episode)\s*0*(\d{1,3})\b/i);
  if (epOnly) {
    const series = (epOnly[1] ?? "").trim() || folders[folders.length - 1] || base;
    return { kind: "series", name: series, seriesName: series, season: 1, episode: Number(epOnly[2]) || 1 };
  }

  return { kind: "movie", name: base, seriesName: "", season: null, episode: null };
}
