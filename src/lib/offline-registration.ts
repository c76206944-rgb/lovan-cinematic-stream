import { refuseOfflineWorker } from "./offline-policy";

/** The only app-shell worker registrar. Never cache editor previews. */
export async function registerOfflineApp(): Promise<void> {
  // Keep offline playback in a normal split chunk, not a second Start entry.
  if (document.getElementById("offline-root")) {
    const { mountOfflineApp } = await import("../offline-entry");
    mountOfflineApp();
    return;
  }
  if (!("serviceWorker" in navigator)) return;
  if (refuseOfflineWorker(window.location.hostname, import.meta.env.PROD, window.self !== window.top, window.location.search)) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.filter((r) => [r.active, r.waiting, r.installing].some((w) => w && new URL(w.scriptURL).pathname === "/sw.js")).map((r) => r.unregister()));
    return;
  }
  await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
}