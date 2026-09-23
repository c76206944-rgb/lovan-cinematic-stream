import { useSyncExternalStore } from "react";
import * as tus from "tus-js-client";
import { supabase } from "@/integrations/supabase/client";
import { saveTitle } from "@/lib/catalog.functions";

export type JobState = "waiting" | "uploading" | "saving" | "done" | "failed";

export type Job = {
  id: string;
  file: File;
  name: string;
  kind: "movie" | "series";
  seriesName: string;
  season: number | null;
  episode: number | null;
  publish: boolean;
  state: JobState;
  progress: number;
  message: string;
  videoPath: string | null;
  titleId: string | null;
};

const MAX_PARALLEL = 3;
let jobs: Job[] = [];
const listeners = new Set<() => void>();

function emit() {
  jobs = [...jobs];
  listeners.forEach((l) => l());
}

function patch(id: string, p: Partial<Job>) {
  const job = jobs.find((j) => j.id === id);
  if (!job) return;
  Object.assign(job, p);
  emit();
}

/** Guess title, season and episode from a file name like "Show.Name.S01E03.mp4". */
export function guessFromFile(file: File) {
  const base = file.name.replace(/\.[^.]+$/, "").replace(/[._]+/g, " ").trim();
  const m = base.match(/^(.*?)[\s-]*s(\d{1,2})\s*e(\d{1,3})/i);
  if (m) {
    const series = (m[1] ?? "").trim() || base;
    return { kind: "series" as const, name: series, seriesName: series, season: Number(m[2]), episode: Number(m[3]) };
  }
  return { kind: "movie" as const, name: base, seriesName: "", season: null, episode: null };
}

export function addJobs(items: Omit<Job, "id" | "state" | "progress" | "message" | "videoPath" | "titleId">[]) {
  for (const item of items) {
    jobs.push({ ...item, id: crypto.randomUUID(), state: "waiting", progress: 0, message: "Waiting", videoPath: null, titleId: null });
  }
  emit();
  pump();
}

export function retryJob(id: string) {
  patch(id, { state: "waiting", message: "Waiting" });
  pump();
}

export function clearFinished() {
  jobs = jobs.filter((j) => j.state !== "done");
  emit();
}

export function removeJob(id: string) {
  jobs = jobs.filter((j) => j.id !== id || j.state === "uploading" || j.state === "saving");
  emit();
}

function pump() {
  const running = jobs.filter((j) => j.state === "uploading" || j.state === "saving").length;
  const free = MAX_PARALLEL - running;
  jobs.filter((j) => j.state === "waiting").slice(0, Math.max(free, 0)).forEach((j) => void run(j));
}

async function upload(job: Job): Promise<string> {
  const safe = job.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `videos/${Date.now()}-${safe}`;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Your session has ended. Sign in again.");
  const base = import.meta.env["VITE_SUPABASE_URL"] as string;
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string;
  await new Promise<void>((resolve, reject) => {
    const up = new tus.Upload(job.file, {
      endpoint: `${base}/storage/v1/upload/resumable`,
      headers: { authorization: `Bearer ${token}`, apikey: key, "x-upsert": "false" },
      metadata: { bucketName: "media", objectName: path, contentType: job.file.type || "application/octet-stream", cacheControl: "3600" },
      retryDelays: [0, 1000, 3000, 5000, 10000, 20000],
      chunkSize: 6 * 1024 * 1024,
      removeFingerprintOnSuccess: true,
      onProgress: (sent, total) => {
        const pct = Math.round((sent / Math.max(total, 1)) * 100);
        patch(job.id, { progress: pct, message: `Uploading ${pct}%` });
      },
      onSuccess: () => resolve(),
      onError: (e) => reject(e),
    });
    up.findPreviousUploads().then((prev) => {
      if (prev[0]) up.resumeFromPreviousUpload(prev[0]);
      up.start();
    });
  });
  return path;
}

async function run(job: Job) {
  try {
    if (!job.videoPath) {
      patch(job.id, { state: "uploading", message: "Uploading 0%" });
      const path = await upload(job);
      patch(job.id, { videoPath: path, progress: 100 });
    }
    patch(job.id, { state: "saving", message: "Adding to catalogue" });
    const res = await saveTitle({
      data: {
        name: job.name || job.file.name,
        kind: job.kind,
        series_name: job.kind === "series" ? job.seriesName || job.name : "",
        season: job.kind === "series" ? job.season ?? 1 : null,
        episode: job.kind === "series" ? job.episode ?? 1 : null,
        episode_title: "",
        synopsis: "",
        genres: [],
        cast_members: [],
        director: "",
        country: "",
        language: "",
        runtime: "",
        maturity: "",
        year: new Date().getFullYear(),
        premium: false,
        published: job.publish,
        ad_enabled: false,
        ad_placements: [],
        ad_cues: "",
        ad_notes: "",
        video_path: job.videoPath,
        poster_url: null,
        upload_key: job.id,
      },
    });
    patch(job.id, {
      state: "done",
      titleId: res.id,
      message: res.duplicate ? "Already in the catalogue" : "Saved",
    });
  } catch (e) {
    patch(job.id, { state: "failed", message: e instanceof Error ? e.message : "Upload stopped. Press Retry." });
  } finally {
    pump();
  }
}

export function isBusy() {
  return jobs.some((j) => j.state === "uploading" || j.state === "saving" || j.state === "waiting");
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", (e) => {
    if (isBusy()) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
}

export function useJobs() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => jobs,
    () => jobs,
  );
}
