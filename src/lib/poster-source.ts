/** Rewrites common thumbnail picture links to their largest original version. */
export function upgradePosterUrl(input: string): string[] {
  const candidates: string[] = [];
  const push = (value: string) => {
    if (value && !candidates.includes(value)) candidates.push(value);
  };

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return [input];
  }

  const host = url.hostname.replace(/^www\./, "");

  // TMDB / themoviedb image CDN: /t/p/w185/abc.jpg -> /t/p/original/abc.jpg
  if (host.endsWith("tmdb.org") || host.endsWith("themoviedb.org")) {
    push(url.toString().replace(/\/t\/p\/[^/]+\//, "/t/p/original/"));
  }

  // Wikimedia thumbnails: /wikipedia/commons/thumb/a/ab/File.jpg/320px-File.jpg
  if (host.endsWith("wikimedia.org") || host.endsWith("wikipedia.org")) {
    const match = url.pathname.match(/^(.*)\/thumb\/(.+)\/[^/]+$/);
    if (match) push(`${url.origin}${match[1]}/${match[2]}`);
  }

  // Imgur size suffixes: abcdefgs.jpg -> abcdef.jpg
  if (host.endsWith("imgur.com")) {
    push(url.toString().replace(/([A-Za-z0-9]{7})[sbtmlh](\.[a-z]+)$/, "$1$2"));
  }

  // Generic resize query parameters used by many sites and CDNs.
  const resizeKeys = ["w", "h", "width", "height", "size", "resize", "fit", "q", "quality", "sz", "s"];
  if (resizeKeys.some((key) => url.searchParams.has(key))) {
    const stripped = new URL(url.toString());
    for (const key of resizeKeys) stripped.searchParams.delete(key);
    push(stripped.toString());
  }

  // Original link last, so it is used only when the larger versions fail.
  push(url.toString());
  return candidates;
}
