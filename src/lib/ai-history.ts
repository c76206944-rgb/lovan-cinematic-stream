export type HistoryFields = Record<string, string>;

export type HistoryEntry = {
  id: string;
  titleId: string;
  at: number;
  label: string;
  before: HistoryFields;
  after: HistoryFields;
};

const KEY = "lovan-metadata-history";
const MAX_PER_TITLE = 20;

export const TRACKED_FIELDS = [
  "name",
  "series_name",
  "episode_title",
  "synopsis",
  "genres",
  "cast_members",
  "director",
  "country",
  "language",
  "runtime",
  "maturity",
  "year",
] as const;

export const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  series_name: "Series name",
  episode_title: "Episode title",
  synopsis: "Summary",
  genres: "Genres",
  cast_members: "Cast",
  director: "Director",
  country: "Country",
  language: "Language",
  runtime: "Runtime",
  maturity: "Age rating",
  year: "Year",
};

function readAll(): HistoryEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(entries: HistoryEntry[]) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    /* storage full or unavailable */
  }
}

/** Turn a catalogue row into the flat string snapshot we compare against. */
export function snapshot(row: Record<string, unknown>): HistoryFields {
  const out: HistoryFields = {};
  for (const key of TRACKED_FIELDS) {
    const value = row[key];
    out[key] = Array.isArray(value) ? value.join(", ") : value == null ? "" : String(value);
  }
  return out;
}

export function changedKeys(before: HistoryFields, after: HistoryFields): string[] {
  return TRACKED_FIELDS.filter((key) => (before[key] ?? "") !== (after[key] ?? ""));
}

export function listHistory(titleId: string): HistoryEntry[] {
  return readAll()
    .filter((e) => e.titleId === titleId)
    .sort((a, b) => b.at - a.at);
}

export function addHistory(titleId: string, label: string, before: HistoryFields, after: HistoryFields): HistoryEntry | null {
  if (changedKeys(before, after).length === 0) return null;
  const entry: HistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    titleId,
    at: Date.now(),
    label,
    before,
    after,
  };
  const all = readAll();
  const mine = all.filter((e) => e.titleId === titleId);
  const others = all.filter((e) => e.titleId !== titleId);
  const kept = [entry, ...mine].slice(0, MAX_PER_TITLE);
  writeAll([...others, ...kept]);
  return entry;
}

export function clearHistory(titleId: string) {
  writeAll(readAll().filter((e) => e.titleId !== titleId));
}

export function describeTime(at: number): string {
  const diff = Date.now() - at;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(at).toLocaleDateString();
}
