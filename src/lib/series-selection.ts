export type SeriesRow = { id: string; kind: string; series_name: string; published?: boolean; archived?: boolean };
export const seriesKey = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();
export function seriesGroups(rows: SeriesRow[]) {
  const groups = new Map<string, { key: string; name: string; ids: string[]; published: boolean }>();
  for (const row of rows) {
    if (row.kind !== "series" || !row.series_name.trim()) continue;
    const key = seriesKey(row.series_name);
    const group = groups.get(key) ?? { key, name: row.series_name.trim(), ids: [], published: true };
    group.ids.push(row.id);
    group.published = group.published && Boolean(row.published && !row.archived);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}