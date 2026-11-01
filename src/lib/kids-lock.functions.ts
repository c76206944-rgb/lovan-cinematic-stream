import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const COOKIE = "lovan_kids_lock";
const pinSchema = z.object({ pin: z.string().regex(/^\d{4}$/) });

async function hex(buf: ArrayBuffer) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function sha(text: string) {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}
async function sign(text: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_URL || "lovan";
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`kids:${text}`)));
}

/** Reads the server-held kids lock. Returns the parsed lock when the signature is valid. */
export async function readKidsLock(): Promise<{ salt: string; hash: string } | null> {
  const { getCookie } = await import("@tanstack/react-start/server");
  const raw = getCookie(COOKIE);
  if (!raw) return null;
  const [salt, hash, mac] = raw.split(".");
  if (!salt || !hash || !mac) return null;
  return (await sign(`${salt}.${hash}`)) === mac ? { salt, hash } : null;
}

/** Turns Kids Mode on for this browser; the PIN is hashed and kept in a signed, script-proof cookie. */
export const lockKidsMode = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => pinSchema.parse(i))
  .handler(async ({ data }) => {
    const { setCookie } = await import("@tanstack/react-start/server");
    if (await readKidsLock()) return { ok: true };
    const salt = crypto.randomUUID().replace(/-/g, "");
    const hash = await sha(`${salt}:${data.pin}`);
    const mac = await sign(`${salt}.${hash}`);
    setCookie(COOKIE, `${salt}.${hash}.${mac}`, {
      httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 * 5,
    });
    return { ok: true };
  });

/** Leaves Kids Mode only when the PIN matches the server-held hash. */
export const unlockKidsMode = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => pinSchema.parse(i))
  .handler(async ({ data }) => {
    const lock = await readKidsLock();
    if (!lock) return { ok: true };
    if ((await sha(`${lock.salt}:${data.pin}`)) !== lock.hash) return { ok: false };
    const { deleteCookie } = await import("@tanstack/react-start/server");
    deleteCookie(COOKIE, { path: "/" });
    return { ok: true };
  });
