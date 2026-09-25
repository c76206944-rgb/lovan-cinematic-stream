/**
 * Ad configuration, viewer consent, the per person daily cap and diagnostics.
 *
 * Rules enforced here:
 * - No ad code runs before the viewer accepts adverts.
 * - Studio staff never see adverts.
 * - Every viewer sees at most DAILY_AD_LIMIT adverts per calendar day (UTC).
 * - Ad code is injected once per page load, never twice.
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
/** Monetag push notification zone, served through the background helper. */
export const PUSH_ZONE = "11883577";

export const ZONES = [
  { id: MULTITAG_ZONE, label: "MultiTag", kind: "Popunder, vignette, in page push" },
  { id: INPAGE_ZONE, label: "Optimistic tag", kind: "In-Page Push" },
  { id: PUSH_ZONE, label: "Push notifications", kind: "Background helper" },
] as const;

const COUNT_KEY = "lovan-ad-count";
const CONSENT_KEY = "lovan-ad-consent";

/* ------------------------------------------------------------------ */
/* Consent                                                             */
/* ------------------------------------------------------------------ */

export type Consent = { ads: boolean; push: boolean; at: string };

export function getConsent(): Consent | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Consent;
    return { ads: Boolean(parsed.ads), push: Boolean(parsed.push), at: String(parsed.at ?? "") };
  } catch {
    return null;
  }
}

export function setConsent(next: { ads: boolean; push: boolean }): Consent {
  const value: Consent = { ads: next.ads, push: next.push, at: new Date().toISOString() };
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((fn) => fn());
  return value;
}

export function clearConsent(): void {
  try {
    localStorage.removeItem(CONSENT_KEY);
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((fn) => fn());
}

const listeners = new Set<() => void>();

/** Listen for consent or staff changes. */
export function onAdStateChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* ------------------------------------------------------------------ */
/* Staff exemption                                                     */
/* ------------------------------------------------------------------ */

let staffMode = false;

/** Studio staff never see adverts. Called once the account is known. */
export function setStaffMode(value: boolean): void {
  if (staffMode === value) return;
  staffMode = value;
  listeners.forEach((fn) => fn());
}

export function isStaffMode(): boolean {
  return staffMode;
}

/* ------------------------------------------------------------------ */
/* Daily cap                                                           */
/* ------------------------------------------------------------------ */

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

type Counter = { day: string; count: number };

function read(): Counter {
  if (typeof localStorage === "undefined") return { day: today(), count: 0 };
  try {
    const raw = localStorage.getItem(COUNT_KEY);
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
    localStorage.setItem(COUNT_KEY, JSON.stringify(c));
  } catch {
    /* storage unavailable */
  }
}

/** How many adverts this viewer has already seen today. */
export function adsSeenToday(): number {
  return read().count;
}

/** Reset this device's daily count. Used by the studio diagnostics panel. */
export function resetAdCount(): void {
  write({ day: today(), count: 0 });
  listeners.forEach((fn) => fn());
}

/** Force this device to the daily cap, for testing from the studio. */
export function fillAdCount(): void {
  write({ day: today(), count: DAILY_AD_LIMIT });
  listeners.forEach((fn) => fn());
}

/** True when adverts may run right now: consent given, not staff, under the cap. */
export function adsAllowed(): boolean {
  if (staffMode) return false;
  const consent = getConsent();
  if (!consent || !consent.ads) return false;
  return adsSeenToday() < DAILY_AD_LIMIT;
}

/** Count one shown advert. Returns false when the viewer is already at the cap. */
export function countAd(): boolean {
  const c = read();
  if (c.count >= DAILY_AD_LIMIT) return false;
  write({ day: c.day, count: c.count + 1 });
  listeners.forEach((fn) => fn());
  return true;
}

/* ------------------------------------------------------------------ */
/* Delivery log                                                        */
/* ------------------------------------------------------------------ */

export type AdEvent = { at: string; zone: string; status: "loaded" | "failed" | "blocked"; note: string };

const events: AdEvent[] = [];

export function logAdEvent(zone: string, status: AdEvent["status"], note: string): void {
  events.unshift({ at: new Date().toISOString(), zone, status, note });
  if (events.length > 30) events.length = 30;
  listeners.forEach((fn) => fn());
}

export function adEvents(): AdEvent[] {
  return events.slice();
}

/* ------------------------------------------------------------------ */
/* Script loading                                                      */
/* ------------------------------------------------------------------ */

let multitagLoaded = false;

export function multitagIsLoaded(): boolean {
  return multitagLoaded;
}

function injectOnce(src: string, zone: string): void {
  const existing = document.querySelector(`script[data-lovan-zone="${zone}"]`);
  if (existing) return;
  const s = document.createElement("script");
  s.src = src;
  s.async = true;
  s.dataset["zone"] = zone;
  s.dataset["lovanZone"] = zone;
  s.setAttribute("data-cfasync", "false");
  s.addEventListener("load", () => logAdEvent(zone, "loaded", "Tag loaded"));
  s.addEventListener("error", () => logAdEvent(zone, "blocked", "Tag could not load, likely blocked"));
  document.head.appendChild(s);
}

/**
 * Load the site wide Monetag tags once per page load, and only when adverts
 * are allowed. These tags handle the page level formats themselves, so they
 * must never be injected a second time inside the page.
 */
export function loadMultitag(): void {
  if (multitagLoaded) return;
  if (typeof document === "undefined") return;
  if (!adsAllowed()) return;
  multitagLoaded = true;

  injectOnce(AD_TAG_SRC, MULTITAG_ZONE);
  injectOnce(INPAGE_TAG_SRC, INPAGE_ZONE);
  countAd();
}

/** Which of the configured zones have a tag present on the page right now. */
export function loadedZones(): string[] {
  if (typeof document === "undefined") return [];
  return ZONES.filter((z) => document.querySelector(`script[data-lovan-zone="${z.id}"]`)).map((z) => z.id);
}
