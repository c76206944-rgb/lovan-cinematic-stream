import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useJobs, retryAll, queueStorage, freeFinishedFiles, enableBrowserNotifications, notificationsSupported, getAlertPrefs, setAlertPrefs, type AlertPrefs, type AlertEvent } from "@/lib/upload-queue";

const size = (b: number) => (b >= 1e9 ? `${(b / 1e9).toFixed(2)} GB` : b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} KB`);

/** Small floating panel that follows you on every page while uploads run. */
export function UploadDock() {
  const jobs = useJobs();
  const [open, setOpen] = useState(false);
  const [perm, setPerm] = useState<string>("default");
  const [prefs, setPrefs] = useState<AlertPrefs | null>(null);
  const [showPrefs, setShowPrefs] = useState(false);
  useEffect(() => setPrefs(getAlertPrefs()), []);
  const flip = (e: AlertEvent, k: "app" | "browser") => {
    if (!prefs) return;
    const next = { ...prefs, [e]: { ...prefs[e], [k]: !prefs[e][k] } };
    setPrefs(next);
    setAlertPrefs(next);
  };
  const [free, setFree] = useState<number | null>(null);
  useEffect(() => {
    if (notificationsSupported()) setPerm(Notification.permission);
    void navigator.storage?.estimate?.().then((e) => setFree(e.quota != null && e.usage != null ? e.quota - e.usage : null));
  }, [jobs.length]);
  if (jobs.length === 0) return null;
  const active = jobs.filter((j) => j.state === "waiting" || j.state === "uploading" || j.state === "saving").length;
  const failed = jobs.filter((j) => j.state === "failed").length;
  const used = queueStorage(jobs);
  const avg = Math.round(jobs.reduce((s, j) => s + (j.state === "done" ? 100 : j.progress), 0) / jobs.length);
  return (
    <div className="fixed right-3 z-50 w-[min(22rem,calc(100vw-1.5rem))] rounded-lg border border-border bg-card text-sm bottom-[calc(5rem+env(safe-area-inset-bottom))] lg:bottom-[calc(1rem+env(safe-area-inset-bottom))]">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left">
        <span className="truncate">
          {active ? `Uploading ${active} of ${jobs.length}` : "Uploads finished"}
          {failed ? `, ${failed} need retry` : ""}
        </span>
        <span className="shrink-0 text-muted-foreground">{avg}%</span>
      </button>
      <div className="h-1 bg-muted">
        <div className="h-1 bg-primary transition-all" style={{ width: `${avg}%` }} />
      </div>
      {open ? (
        <div className="max-h-72 overflow-y-auto p-2">
          {jobs.map((j) => (
            <div key={j.id} className="flex items-center gap-2 border-b border-border px-1 py-2 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="truncate">{j.kind === "series" ? `${j.seriesName || j.name} S${j.season}E${j.episode}` : j.name}</p>
                <p className={`truncate text-xs ${j.state === "failed" ? "text-destructive" : "text-muted-foreground"}`}>{j.message}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{j.state === "done" ? 100 : j.progress}%</span>
              {j.state === "done" && j.titleId ? (
                <Link to="/admin/catalog" search={{ edit: j.titleId }} className="shrink-0 text-xs text-primary">Edit</Link>
              ) : null}
            </div>
          ))}
          <div className="mt-2 rounded-md border border-border p-2 text-xs text-muted-foreground">
            <p>Temporary files on this device: {size(used.total)}</p>
            <p>Finished, safe to remove: {size(used.finished)}. Still uploading: {size(used.pending)}</p>
            {free != null ? <p>Free space for LOVAN: {size(free)}</p> : null}
            <button type="button" disabled={!used.finished} onClick={() => void freeFinishedFiles()} className="mt-1 text-primary disabled:opacity-50">Remove finished files</button>
          </div>
          {notificationsSupported() && perm !== "granted" ? (
            <button type="button" disabled={perm === "denied"} onClick={() => void enableBrowserNotifications().then((p) => setPerm(String(p)))} className="mt-2 text-xs text-primary disabled:opacity-50">
              {perm === "denied" ? "Notifications blocked in browser settings" : "Notify me when uploads finish or fail"}
            </button>
          ) : null}
          <button type="button" onClick={() => setShowPrefs(!showPrefs)} className="mt-2 block text-xs text-primary">Alert settings</button>
          {showPrefs && prefs ? (
            <table className="mt-1 w-full text-xs">
              <thead className="text-muted-foreground"><tr><th className="text-left font-normal">Event</th><th className="font-normal">In app</th><th className="font-normal">Browser</th></tr></thead>
              <tbody>
                {([["done", "Finished"], ["failed", "Failed"], ["paused", "Paused"], ["retry", "Retrying"]] as [AlertEvent, string][]).map(([e, l]) => (
                  <tr key={e}>
                    <td className="py-1">{l}</td>
                    <td className="text-center"><input type="checkbox" aria-label={`${l} in app`} checked={prefs[e].app} onChange={() => flip(e, "app")} /></td>
                    <td className="text-center"><input type="checkbox" aria-label={`${l} browser`} checked={prefs[e].browser} onChange={() => flip(e, "browser")} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          <div className="flex justify-between pt-2">
            <Link to="/admin/bulk" className="text-xs text-primary">Manage uploads</Link>
            {failed ? <button type="button" onClick={retryAll} className="text-xs">Retry all</button> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
