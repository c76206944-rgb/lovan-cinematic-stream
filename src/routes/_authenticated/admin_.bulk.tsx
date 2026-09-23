import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminTabs, StaffGate } from "@/components/site/AdminTabs";
import { useAccount } from "@/lib/use-account";
import { addJobs, guessFromFile, useJobs, retryJob, cancelJob, pauseJob, resumeJob, retryAll, pauseAll, resumeAll, clearFinished, type Job } from "@/lib/upload-queue";

export const Route = createFileRoute("/_authenticated/admin_/bulk")({
  head: () => ({
    meta: [
      { title: "Upload many titles | LOVAN Studio" },
      { name: "description", content: "Upload many films and episodes at once in LOVAN Studio." },
      { property: "og:title", content: "Upload many titles | LOVAN Studio" },
      { property: "og:description", content: "Upload many films and episodes at once." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BulkPage,
});

type Draft = Omit<Job, "id" | "state" | "progress" | "message" | "videoPath" | "titleId" | "warnings">;

function BulkPage() {
  const account = useAccount();
  const jobs = useJobs();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [publish, setPublish] = useState(false);

  const pick = (files: FileList | null) => {
    if (!files) return;
    const next = Array.from(files).map((file) => ({ file, publish: false, ...guessFromFile(file) }));
    setDrafts((d) => [...d, ...next]);
  };
  const edit = (i: number, p: Partial<Draft>) => setDrafts((d) => d.map((x, k) => (k === i ? { ...x, ...p } : x)));
  const start = () => {
    addJobs(drafts.map((d) => ({ ...d, publish })));
    setDrafts([]);
  };

  return (
    <StaffGate ready={account.ready} staff={account.staff} email={account.email}>
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold">Upload many titles</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick as many videos as you like. They upload together and keep going while you use other pages. Add details later in the Catalogue.
        </p>
        <div className="mt-6"><AdminTabs /></div>

        <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm hover:border-primary">
          <span className="font-medium">Choose video files</span>
          <span className="mt-1 text-muted-foreground">Films and episodes. Names like Show S01E02 are detected as episodes.</span>
          <input type="file" accept="video/*,.m3u8,.mkv,.avi" multiple className="hidden" onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
        </label>

        {drafts.length ? (
          <div className="mt-6 space-y-3">
            {drafts.map((d, i) => (
              <div key={i} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-center">
                <input value={d.name} onChange={(e) => edit(i, { name: e.target.value, seriesName: d.kind === "series" ? e.target.value : d.seriesName })} className="min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm" aria-label="Title name" />
                <select value={d.kind} onChange={(e) => edit(i, { kind: e.target.value as Draft["kind"], season: d.season ?? 1, episode: d.episode ?? 1, seriesName: d.seriesName || d.name })} className="rounded-md border border-input bg-background px-2 py-2 text-sm">
                  <option value="movie">Film</option>
                  <option value="series">Episode</option>
                </select>
                {d.kind === "series" ? (
                  <>
                    <input type="number" min={1} value={d.season ?? 1} onChange={(e) => edit(i, { season: Number(e.target.value) || 1 })} className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm sm:w-20" aria-label="Season" />
                    <input type="number" min={1} value={d.episode ?? 1} onChange={(e) => edit(i, { episode: Number(e.target.value) || 1 })} className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm sm:w-20" aria-label="Episode" />
                  </>
                ) : <><span className="hidden sm:block" /><span className="hidden sm:block" /></>}
                <button type="button" onClick={() => setDrafts((x) => x.filter((_, k) => k !== i))} className="text-sm text-muted-foreground">Remove</button>
              </div>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} /> Publish right away
            </label>
            <button type="button" onClick={start} className="w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground sm:w-auto">
              Start uploading {drafts.length} {drafts.length === 1 ? "title" : "titles"}
            </button>
          </div>
        ) : null}

        {jobs.length ? (
          <div className="mt-10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Upload queue</h2>
              <div className="flex flex-wrap justify-end gap-3 text-sm text-muted-foreground">
                <button type="button" onClick={pauseAll}>Pause all</button>
                <button type="button" onClick={resumeAll}>Resume all</button>
                <button type="button" onClick={retryAll}>Retry all</button>
                <button type="button" onClick={clearFinished}>Clear finished</button>
              </div>
            </div>
            <div className="mt-3 divide-y divide-border rounded-lg border border-border">
              {jobs.map((j) => (
                <div key={j.id} className="flex flex-wrap items-center gap-2 p-3 sm:flex-nowrap sm:gap-3">
                  <div className="min-w-0 basis-full sm:basis-auto sm:flex-1">
                    <p className="truncate text-sm">{j.kind === "series" ? `${j.seriesName || j.name} S${j.season}E${j.episode}` : j.name}</p>
                    <div className="mt-1.5 h-1 rounded bg-muted"><div className="h-1 rounded bg-primary" style={{ width: `${j.state === "done" ? 100 : j.progress}%` }} /></div>
                    <p className={`mt-1 truncate text-xs ${j.state === "failed" ? "text-destructive" : j.warnings?.length ? "text-primary" : "text-muted-foreground"}`}>{j.message}</p>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{j.state === "done" ? 100 : j.progress}%</span>
                  {j.state === "uploading" || j.state === "waiting" ? <button type="button" onClick={() => pauseJob(j.id)} className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs">Pause</button> : null}
                  {j.state === "paused" ? <button type="button" onClick={() => resumeJob(j.id)} className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs">Resume</button> : null}
                  {j.state === "failed" ? <button type="button" onClick={() => retryJob(j.id)} className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs">Retry</button> : null}
                  {j.state === "done" && j.titleId ? (
                    <Link to="/admin/catalog" search={{ edit: j.titleId }} className="shrink-0 rounded-md border border-primary px-3 py-1.5 text-xs text-primary">
                      Edit
                    </Link>
                  ) : null}
                  {j.state !== "done" && j.state !== "saving" ? <button type="button" onClick={() => cancelJob(j.id)} className="shrink-0 text-xs text-muted-foreground">Cancel</button> : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </StaffGate>
  );
}
