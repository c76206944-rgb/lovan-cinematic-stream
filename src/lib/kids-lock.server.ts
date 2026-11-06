import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";

const COOKIE = "lovan_kids_lock";

async function hex(buf: ArrayBuffer) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha(text: string) {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}

async function sign(text: string) {
  const secret = process.env["SUPABASE_SERVICE_ROLE_KEY"] || process.env["SUPABASE_URL"] || "lovan";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`kids:${text}`)));
}

/** Reads the signed, server-held lock without exposing its hash to the browser. */
export async function readKidsLock(): Promise<{ salt: string; hash: string } | null> {
  const raw = getCookie(COOKIE);
  if (!raw) return null;
  const [salt, hash, mac] = raw.split(".");
  if (!salt || !hash || !mac) return null;
  return (await sign(`${salt}.${hash}`)) === mac ? { salt, hash } : null;
}

export async function setKidsLock(pin: string) {
  if (await readKidsLock()) return { ok: true };
  const salt = crypto.randomUUID().replace(/-/g, "");
  const hash = await sha(`${salt}:${pin}`);
  const mac = await sign(`${salt}.${hash}`);
  setCookie(COOKIE, `${salt}.${hash}.${mac}`, {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 * 5,
  });
  return { ok: true };
}

export async function removeKidsLock(pin: string) {
  const lock = await readKidsLock();
  if (!lock) return { ok: true };
  if ((await sha(`${lock.salt}:${pin}`)) !== lock.hash) return { ok: false };
  deleteCookie(COOKIE, { path: "/" });
  return { ok: true };
}