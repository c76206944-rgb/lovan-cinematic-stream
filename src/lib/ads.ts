/**
 * Ad configuration and the per person daily cap.
 *
 * Every viewer sees at most DAILY_AD_LIMIT ads per calendar day (UTC).
 * The count is kept on the viewer's own device.
 */

export const DAILY_AD_LIMIT = 15;

/** Monetag MultiTag zone (popunder, vignette, in page push). */
export const MULTITAG_ZONE = "286079";
/** Monetag zone used inside the on page advertisement boxes. */
export const BANNER_ZONE = "286079";
/** Monetag tag host. */
export const AD_TAG_SRC = "https://quge5.com/88/tag.min.js";
/** Extra Monetag In-Page Push zone ("Optimistic tag"). */
export const INPAGE_ZONE = "11885055";
export const INPAGE_TAG_SRC = "https://nap5k.com/tag.min.js";

const KEY = "lovan-ad-count";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

type Counter = { day: string; count: number };

function read(): Counter {
  if (typeof localStorage === "undefined") return { day: today(), count: 0 };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { day: today(), count: 0 };
    const parsed = JSON.parse(raw) as Counter;
    if (parsed.day !== today()) return { day: today(), count: 0 };
    return { day: parsed.day, count: Number(parsed.count) || 0 };
  } catch {
    return { day: today(), count: 0 };
  }
}

function write(c: Counter) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* storage unavailable */
  }
}

/** How many ads this viewer has already seen today. */
export function adsSeenToday(): number {
  return read().count;
}

/** True when the viewer still has room for another ad today. */
export function adsAllowed(): boolean {
  return adsSeenToday() < DAILY_AD_LIMIT;
}

/** Count one shown ad. Returns false when the viewer is already at the cap. */
export function countAd(): boolean {
  const c = read();
  if (c.count >= DAILY_AD_LIMIT) return false;
  write({ day: c.day, count: c.count + 1 });
  return true;
}

let multitagLoaded = false;

/** Load the site wide Monetag tag once, and only while the viewer is under the cap. */
export function loadMultitag(): void {
  if (multitagLoaded) return;
  if (typeof document === "undefined") return;
  if (!adsAllowed()) return;
  multitagLoaded = true;

  const s = document.createElement("script");
  s.src = AD_TAG_SRC;
  s.async = true;
  s.dataset["zone"] = MULTITAG_ZONE;
  s.setAttribute("data-cfasync", "false");
  document.head.appendChild(s);

  const push = document.createElement("script");
  push.src = INPAGE_TAG_SRC;
  push.async = true;
  push.dataset["zone"] = INPAGE_ZONE;
  push.setAttribute("data-cfasync", "false");
  document.head.appendChild(push);

  countAd();
}
