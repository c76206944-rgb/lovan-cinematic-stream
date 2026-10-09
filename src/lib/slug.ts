export function slugify(name: string) {
  return name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

/** Readable link part for a title, e.g. "spider-man-brand-new-day". Falls back to the id. */
export function titleSlug(name: string, id: string) {
  return slugify(name) || id;
}
