import { useSyncExternalStore } from "react";
import type { Title } from "@/data/titles";

const KEY = "lovan-kids-mode";
const PIN_KEY = "lovan-kids-pin";
const listeners = new Set<() => void>();

/** Genres that count as safe for children. */
export const KIDS_GENRES = ["animation", "anime", "kids", "family", "cartoon", "cartoons", "children"];
const ADULT_MATURITY = ["16+", "18+", "r", "nc-17", "tv-ma"];

export function isKidsTitle(t: Pick<Title, "genres" | "maturity">): boolean {
  if (ADULT_MATURITY.includes((t.maturity || "").trim().toLowerCase())) return false;
  return t.genres.some((g) => KIDS_GENRES.includes(g.trim().toLowerCase()));
}

export function isKidsMode(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function kidsPin(): string | null {
  try {
    return localStorage.getItem(PIN_KEY);
  } catch {
    return null;
  }
}

/** Turn kids mode on with a 4 digit parent PIN. */
export function enterKidsMode(pin: string): void {
  localStorage.setItem(PIN_KEY, pin);
  localStorage.setItem(KEY, "1");
  listeners.forEach((fn) => fn());
}

/** Leave kids mode. Returns false when the PIN is wrong. */
export function exitKidsMode(pin: string): boolean {
  if (pin !== kidsPin()) return false;
  localStorage.removeItem(KEY);
  listeners.forEach((fn) => fn());
  return true;
}

export function onKidsModeChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Kids mode state; always false during server render so the first paint matches. */
export function useKidsMode(): boolean {
  return useSyncExternalStore(onKidsModeChange, isKidsMode, () => false);
}
