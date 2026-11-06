import { beforeEach, describe, expect, it, vi } from "vitest";

const cookies = vi.hoisted(() => new Map<string, string>());
vi.mock("@tanstack/react-start/server", () => ({
  getCookie: (name: string) => cookies.get(name),
  setCookie: (name: string, value: string) => cookies.set(name, value),
  deleteCookie: (name: string) => cookies.delete(name),
}));

import { readKidsLock, removeKidsLock, setKidsLock } from "./kids-lock.server";

describe("server-held parent PIN", () => {
  beforeEach(() => cookies.clear());

  it("keeps the lock with a wrong PIN and removes it with the original PIN", async () => {
    await setKidsLock("1234");
    expect(await readKidsLock()).not.toBeNull();
    expect(await removeKidsLock("9999")).toEqual({ ok: false });
    expect(await readKidsLock()).not.toBeNull();
    expect(await removeKidsLock("1234")).toEqual({ ok: true });
    expect(await readKidsLock()).toBeNull();
  });

  it("does not overwrite an existing parent PIN", async () => {
    await setKidsLock("1234");
    await setKidsLock("9999");
    expect(await removeKidsLock("9999")).toEqual({ ok: false });
    expect(await removeKidsLock("1234")).toEqual({ ok: true });
  });

  it("rejects a tampered signature", async () => {
    await setKidsLock("1234");
    const raw = cookies.get("lovan_kids_lock");
    expect(raw).toBeTruthy();
    cookies.set("lovan_kids_lock", `${raw}tampered`);
    expect(await readKidsLock()).toBeNull();
  });
});