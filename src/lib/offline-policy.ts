/** Offline acquisition follows the same availability rules as streaming. */
export function offlineEligible(row: { video_path?: string | null; published: boolean; archived: boolean }): boolean {
  return row.published && !row.archived && Boolean(row.video_path);
}

export function refuseOfflineWorker(hostname: string, production: boolean, inFrame: boolean, search: string): boolean {
  const host = hostname.toLowerCase();
  if (!production || inFrame || new URLSearchParams(search).get("sw") === "off") return true;
  if (["lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"].some((domain) => host === domain || host.endsWith(`.${domain}`))) return true;
  const labels = host.split(".");
  const platform = ["lovable.app", "gpt-eng.com", "gptengineer.run"].includes(labels.slice(1).join("."));
  return platform && (/^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/.test(labels[0] ?? "") || /^project--.+-dev$/.test(labels[0] ?? ""));
}