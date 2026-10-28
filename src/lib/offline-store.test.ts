import "fake-indexeddb/auto";
import { afterEach, expect, it, vi } from "vitest";
import { getOffline, listOffline, openForPlayback, removeOffline, saveOffline } from "./offline-store";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it("keeps saved downloads playable without network or expiry", async () => {
  vi.stubGlobal("navigator", { storage: { persist: async () => true } });
  vi.setSystemTime(new Date("2026-10-28T00:00:00Z"));
  await saveOffline({ id: "offline-test", name: "Saved episode", blob: new Blob(["local video bytes"], { type: "video/mp4" }) });
  vi.setSystemTime(new Date("2200-01-01T00:00:00Z"));
  const network = vi.fn(() => { throw new Error("No data"); });
  vi.stubGlobal("fetch", network);
  expect((await getOffline("offline-test"))?.name).toBe("Saved episode");
  expect((await listOffline()).some((row) => row.id === "offline-test")).toBe(true);
  const url = await openForPlayback("offline-test");
  expect(url.startsWith("blob:")).toBe(true);
  expect(network).not.toHaveBeenCalled();
  URL.revokeObjectURL(url);
  await removeOffline("offline-test");
  expect(await getOffline("offline-test")).toBeUndefined();
});