import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const pinSchema = z.object({ pin: z.string().regex(/^\d{4}$/) });

/** Turns Kids Mode on for this browser; the PIN is hashed and kept in a signed, script-proof cookie. */
export const lockKidsMode = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => pinSchema.parse(i))
  .handler(async ({ data }) => {
    const { setKidsLock } = await import("./kids-lock.server");
    return setKidsLock(data.pin);
  });

/** Leaves Kids Mode only when the PIN matches the server-held hash. */
export const unlockKidsMode = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => pinSchema.parse(i))
  .handler(async ({ data }) => {
    const { removeKidsLock } = await import("./kids-lock.server");
    return removeKidsLock(data.pin);
  });
