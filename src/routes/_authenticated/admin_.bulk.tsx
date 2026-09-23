import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminTabs, StaffGate } from "@/components/site/AdminTabs";
import { useAccount } from "@/lib/use-account";
import {
  addJobs,
  guessFromFile,
  useJobs,
  retryJob,
  cancelJob,
  pauseJob,
  resumeJob,
  retryAll,
  pauseAll,
  resumeAll,
  clearFinished,
  isBusy,
  getValidSessionToken,
  type Job,
} from "@/lib/upload-queue";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin_/bulk")({
  ssr: false,
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

function formatBytes(bytes: number) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function BulkPage() {
  const account = useAccount();
  const jobs = useJobs();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [publish, setPublish] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [sessionExpiring, setSessionExpiring] = useState(false);

  // Prevent accidental tab closes or page navigations when uploads are in progress
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isBusy() || drafts.length > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [drafts.length]);

  // Prevent browser window from navigating away when dropping files outside the dropzone
  useEffect(() => {
    const preventWindowDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("dragover", preventWindowDrop);
    window.addEventListener("drop", preventWindowDrop);
    return () => {
      window.removeEventListener("dragover", preventWindowDrop);
      window.removeEventListener("drop", preventWindowDrop);
    };
  }, []);

  const pick = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size === 0) {
        toast.error(`"${file.name}" is empty (0 bytes) and was skipped.`);
        continue;
      }
      validFiles.push(file);
    }
    if (validFiles.length === 0) return;
    const next = validFiles.map((file) => ({ file, publish: false, ...guessFromFile(file) }));
    setDrafts((d) => [...d, ...next]);
  };

  const edit = (i: number, p: Partial<Draft>) => setDrafts((d) => d.map((x, k) => (k === i ? { ...x, ...p } : x)));

  const start = async () => {
    if (drafts.length === 0) return;
    try {
      // Validate or refresh session before starting batch
      await getValidSessionToken();
      setSessionExpiring(false);
    } catch {
      setSessionExpiring(true);
      toast.error("Your session has ended. Please sign in or refresh the page to upload.");
      return;
    }
    addJobs(drafts.map((d) => ({ ...d, publish })));
    setDrafts([]);
  };

  const refreshSessionAction = async () => {
    try {
      await getValidSessionToken(true);
      setSessionExpiring(false);
      toast.success("Session refreshed successfully.");
      retryAll();
    } catch {
      toast.error("Session could not be refreshed. Please sign in again.");
    }
  };

  return (
    <StaffGate ready={account.ready} staff={account.staff} email={account.email}>
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold">Upload many titles</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick as many videos as you like. They upload together and keep going while you use other pages. Add details later in the Catalogue.
        </p>
        <div className="mt-6"><AdminTabs /></div>

        {sessionExpiring ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            <span>Your login session has expired. Queue is held safely.</span>
            <button
              type="button"
              onClick={refreshSessionAction}
              className="rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:opacity-90"
            >
              Refresh Session & Resume
            </button>
          </div>
        ) : null}

        <label
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            if (e.dataTransfer.files) pick(e.dataTransfer.files);
          }}
          className={`mt-6 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-10 text-center text-sm transition-colors ${
            isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary hover:bg-muted/10"
          }`}
        >
          <span className="font-medium text-foreground">Choose or drop video files here</span>
          <span className="mt-1 text-muted-foreground">Films and episodes. Supports single files or large batches.</span>
          <input
            type="file"
            accept="video/*,.m3u8,.mkv,.avi,.mp4,.mov,.webm"
            multiple
            className="hidden"
            onChange={(e) => {
              pick(e.target.files);
              e.target.value = "";
            }}
          />
        </label>

        {drafts.length ? (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{drafts.length} titles ready to upload</span>
              <button
                type="button"
                onClick={() => setDrafts([])}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear all staged
              </button>
            </div>
            {drafts.map((d, i) => (
              <div key={i} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-center">
                <div className="flex min-w-0 flex-col gap-1">
                  <input
                    value={d.name}
                    onChange={(e) => edit(i, { name: e.target.value, seriesName: d.kind === "series" ? e.target.value : d.seriesName })}
                    className="min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    aria-label="Title name"
                  />
                  <span className="text-xs text-muted-foreground">{d.file?.name} ({formatBytes(d.file?.size || 0)})</span>
                </div>
                <select
                  value={d.kind}
                  onChange={(e) => edit(i, { kind: e.target.value as Draft["kind"], season: d.season ?? 1, episode: d.episode ?? 1, seriesName: d.seriesName || d.name })}
                  className="rounded-md border border-input bg-background px-2 py-2 text-sm"
                >
                  <option value="movie">Film</option>
                  <option value="series">Episode</option>
                </select>
                {d.kind === "series" ? (
                  <>
                    <input
                      type="number"
                      min={1}
                      value={d.season ?? 1}
                      onChange={(e) => edit(i, { season: Number(e.target.value) || 1 })}
                      className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm sm:w-20"
                      aria-label="Season"
                    />
                    <input
                      type="number"
                      min={1}
                      value={d.episode ?? 1}
                      onChange={(e) => edit(i, { episode: Number(e.target.value) || 1 })}
                      className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm sm:w-20"
                      aria-label="Episode"
                    />
                  </>
                ) : (
                  <>
                    <span className="hidden sm:block" />
                    <span className="hidden sm:block" />
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setDrafts((x) => x.filter((_, k) => k !== i))}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Remove
                </button>
              </div>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
              Publish right away
            </label>
            <button
              type="button"
              onClick={start}
              className="w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"
            >
              Start uploading {drafts.length} {drafts.length === 1 ? "title" : "titles"}
            </button>
          </div>
        ) : (
          <div className="mt-6 rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
            No files staged yet. Drag and drop or click above to stage multiple files.
          </div>
        )}

        {jobs.length ? (
          <div className="mt-10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Upload queue</h2>
              <div className="flex flex-wrap justify-end gap-3 text-sm text-muted-foreground">
                <button type="button" onClick={pauseAll} className="hover:text-foreground">Pause all</button>
                <button type="button" onClick={resumeAll} className="hover:text-foreground">Resume all</button>
                <button type="button" onClick={retryAll} className="hover:text-foreground">Retry all</button>
                <button type="button" onClick={clearFinished} className="hover:text-foreground">Clear finished</button>
              </div>
            </div>
            <div className="mt-3 divide-y divide-border rounded-lg border border-border">
              {jobs.map((j) => (
                <div key={j.id} className="flex flex-wrap items-center gap-2 p-3 sm:flex-nowrap sm:gap-3">
                  <div className="min-w-0 basis-full sm:basis-auto sm:flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-medium">
                        {j.kind === "series" ? `${j.seriesName || j.name} S${j.season}E${j.episode}` : j.name}
                      </p>
                      {j.file?.size ? (
                        <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(j.file.size)}</span>
                      ) : null}
                    </div>
                    <div className="mt-1.5 h-1 rounded bg-muted">
                      <div
                        className="h-1 rounded bg-primary transition-all duration-300"
                        style={{ width: `${j.state === "done" ? 100 : j.progress}%` }}
                      />
                    </div>
                    <p className={`mt-1 truncate text-xs ${j.state === "failed" ? "text-destructive" : j.warnings?.length ? "text-primary" : "text-muted-foreground"}`}>
                      {j.message}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {j.state === "done" ? 100 : j.progress}%
                  </span>
                  {j.state === "uploading" || j.state === "waiting" ? (
                    <button type="button" onClick={() => pauseJob(j.id)} className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted/30">Pause</button>
                  ) : null}
                  {j.state === "paused" ? (
                    <button type="button" onClick={() => resumeJob(j.id)} className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted/30">Resume</button>
                  ) : null}
                  {j.state === "failed" ? (
                    <button type="button" onClick={() => retryJob(j.id)} className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted/30">Retry</button>
                  ) : null}
                  {j.state === "done" && j.titleId ? (
                    <Link to="/admin/catalog" search={{ edit: j.titleId }} className="shrink-0 rounded-md border border-primary px-3 py-1.5 text-xs text-primary hover:bg-primary/10">
                      Edit
                    </Link>
                  ) : null}
                  {j.state !== "done" && j.state !== "saving" ? (
                    <button type="button" onClick={() => cancelJob(j.id)} className="shrink-0 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </StaffGate>
  );
}
