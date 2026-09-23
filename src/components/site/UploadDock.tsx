import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useJobs, retryJob, clearFinished } from "@/lib/upload-queue";

/** Small floating panel that follows you on every page while uploads run. */
export function UploadDock() {
  const jobs = useJobs();
  const [open, setOpen] = useState(false);
  if (jobs.length === 0) return null;
  const active = jobs.filter((j) => j.state !== "done" && j.state !== "failed").length;
  const failed = jobs.filter((j) => j.state === "failed").length;
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
              {j.state === "failed" ? (
                <button type="button" onClick={() => retryJob(j.id)} className="shrink-0 rounded-md border border-border px-2 py-1 text-xs">Retry</button>
              ) : null}
            </div>
          ))}
          <div className="flex justify-between pt-2">
            <Link to="/admin/bulk" className="text-xs text-primary">Open uploads</Link>
            <button type="button" onClick={clearFinished} className="text-xs text-muted-foreground">Clear finished</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
