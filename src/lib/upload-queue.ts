import { useSyncExternalStore } from "react";
import { loadTus, type TusUpload } from "@/lib/tus-browser";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { saveTitle } from "@/lib/catalog.functions";

export type JobState = "waiting" | "uploading" | "saving" | "paused" | "done" | "failed";

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
  warnings?: string[];
};

const MAX_PARALLEL = 3;
let jobs: Job[] = [];
const listeners = new Set<() => void>();
const active = new Map<string, TusUpload>();

/* ---------- persistence (IndexedDB keeps the file itself, so uploads survive restarts) ---------- */
const DB = "lovan-uploads";
function db(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore("jobs", { keyPath: "id" });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function store(fn: (s: IDBObjectStore) => void) {
  try {
    const d = await db();
    const tx = d.transaction("jobs", "readwrite");
    fn(tx.objectStore("jobs"));
  } catch {
    /* storage unavailable: queue still works in memory */
  }
}
const persist = (j: Job) => store((s) => s.put({ ...j }));
const unpersist = (id: string) => store((s) => s.delete(id));

function emit() {
  jobs = [...jobs];
  listeners.forEach((l) => l());
}

/* ---------- notifications ---------- */
const label = (j: Job) => (j.kind === "series" ? `${j.seriesName || j.name} S${j.season}E${j.episode}` : j.name);

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}
export async function enableBrowserNotifications() {
  if (!notificationsSupported()) return "unsupported" as const;
  return Notification.requestPermission();
}

export type AlertEvent = "done" | "failed" | "paused" | "retry";
export type AlertPrefs = Record<AlertEvent, { app: boolean; browser: boolean }>;
const PREFS_KEY = "lovan-upload-alerts";
const defaultPrefs: AlertPrefs = {
  done: { app: true, browser: true },
  failed: { app: true, browser: true },
  paused: { app: true, browser: false },
  retry: { app: true, browser: false },
};
export function getAlertPrefs(): AlertPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...defaultPrefs, ...(JSON.parse(raw) as Partial<AlertPrefs>) } : defaultPrefs;
  } catch { return defaultPrefs; }
}
export function setAlertPrefs(p: AlertPrefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

function notify(event: AlertEvent, kind: "success" | "error" | "info", title: string, body: string) {
  const pref = getAlertPrefs()[event];
  if (pref.app) {
  if (kind === "success") toast.success(title, { description: body });
  else if (kind === "error") toast.error(title, { description: body });
  else toast(title, { description: body });
  }
  if (pref.browser && notificationsSupported() && Notification.permission === "granted" && document.visibilityState === "hidden") {
    const opts = { body, icon: "/icon-192.png", tag: `lovan-${title}` };
    void navigator.serviceWorker?.getRegistration().then(async (r) => { if (r) await r.showNotification(title, opts); else new Notification(title, opts); }).catch(() => {
      try { new Notification(title, opts); } catch { /* ignore */ }
    });
  }
}

function announce(job: Job, prev: JobState, next: JobState) {
  if (prev === next) return;
  if (next === "done") notify("done", "success", "Upload finished", `${label(job)}: ${job.message}`);
  else if (next === "failed") notify("failed", "error", "Upload failed", `${label(job)}: ${job.message}`);
  else if (next === "paused") notify("paused", "info", "Upload paused", label(job));
  else if (next === "waiting" && prev === "failed") notify("retry", "info", "Retrying upload", label(job));
}

function patch(id: string, p: Partial<Job>, save = true) {
  const job = jobs.find((j) => j.id === id);
  if (!job) return;
  const prev = job.state;
  Object.assign(job, p);
  if (p.state) announce(job, prev, p.state);
  emit();
  if (save) void persist(job);
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
    const j: Job = { ...item, id: crypto.randomUUID(), state: "waiting", progress: 0, message: "Waiting", videoPath: null, titleId: null };
    jobs.push(j);
    void persist(j);
  }
  emit();
  pump();
}

export function pauseJob(id: string) {
  const up = active.get(id);
  if (up) void up.abort(false);
  active.delete(id);
  patch(id, { state: "paused", message: "Paused" });
  pump();
}

export function resumeJob(id: string) {
  patch(id, { state: "waiting", message: "Waiting" });
  pump();
}

export function cancelJob(id: string) {
  const up = active.get(id);
  if (up) void up.abort(true);
  active.delete(id);
  jobs = jobs.filter((j) => j.id !== id);
  emit();
  void unpersist(id);
  pump();
}

export const retryJob = resumeJob;

export function retryAll() {
  jobs.filter((j) => j.state === "failed").forEach((j) => patch(j.id, { state: "waiting", message: "Waiting" }));
  pump();
}
export function pauseAll() {
  jobs.filter((j) => j.state === "waiting" || j.state === "uploading").forEach((j) => pauseJob(j.id));
}
export function resumeAll() {
  jobs.filter((j) => j.state === "paused").forEach((j) => patch(j.id, { state: "waiting", message: "Waiting" }));
  pump();
}

export function clearFinished() {
  jobs.filter((j) => j.state === "done").forEach((j) => void unpersist(j.id));
  jobs = jobs.filter((j) => j.state !== "done");
  emit();
}

export const removeJob = cancelJob;

/** Bytes of video files held on this device by the queue, split by finished and unfinished. */
export function queueStorage(list: Job[]) {
  let finished = 0, pending = 0;
  for (const j of list) (j.state === "done" ? (finished += j.file?.size ?? 0) : (pending += j.file?.size ?? 0));
  return { finished, pending, total: finished + pending };
}

/** Removes the temporary copies of finished uploads but keeps them listed as done. */
export async function freeFinishedFiles() {
  const done = jobs.filter((j) => j.state === "done");
  for (const j of done) await unpersist(j.id);
  jobs = jobs.filter((j) => j.state !== "done");
  emit();
  return done.length;
}

/* ---------- background sync (installed app) ---------- */
async function requestSync() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const sync = (reg as unknown as { sync?: { register: (t: string) => Promise<void> } } | undefined)?.sync;
    if (sync && isBusy()) await sync.register("lovan-uploads");
  } catch { /* not supported on this browser */ }
}

function pump() {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  const running = jobs.filter((j) => j.state === "uploading" || j.state === "saving").length;
  const free = MAX_PARALLEL - running;
  jobs.filter((j) => j.state === "waiting").slice(0, Math.max(free, 0)).forEach((j) => void run(j));
}

async function upload(job: Job): Promise<string> {
  const safe = job.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  // Path is stable per job so a resumed upload targets the same object.
  const path = `videos/${job.id.slice(0, 8)}-${safe}`;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Your session has ended. Sign in again.");
  const base = import.meta.env["VITE_SUPABASE_URL"] as string;
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string;
  await new Promise<void>((resolve, reject) => {
    const up = new tus.Upload(job.file, {
      endpoint: `${base}/storage/v1/upload/resumable`,
      headers: { authorization: `Bearer ${token}`, apikey: key, "x-upsert": "true" },
      metadata: { bucketName: "media", objectName: path, contentType: job.file.type || "application/octet-stream", cacheControl: "3600" },
      retryDelays: [0, 1000, 3000, 5000, 10000, 20000, 30000],
      chunkSize: 6 * 1024 * 1024,
      removeFingerprintOnSuccess: true,
      fingerprint: async () => `lovan-${job.id}`,
      onProgress: (sent, total) => {
        const pct = Math.round((sent / Math.max(total, 1)) * 100);
        const cur = jobs.find((j) => j.id === job.id);
        if (cur?.state === "uploading") patch(job.id, { progress: pct, message: `Uploading ${pct}%` }, pct % 5 === 0);
      },
      onSuccess: () => resolve(),
      onError: (e) => reject(e),
    });
    active.set(job.id, up);
    up.findPreviousUploads().then((prev) => {
      if (prev[0]) up.resumeFromPreviousUpload(prev[0]);
      up.start();
    });
  });
  active.delete(job.id);
  return path;
}

const stillMine = (id: string, s: JobState) => jobs.find((j) => j.id === id)?.state === s;

async function run(job: Job) {
  try {
    if (!job.videoPath) {
      patch(job.id, { state: "uploading", message: `Uploading ${job.progress}%` });
      const path = await upload(job);
      if (!stillMine(job.id, "uploading")) return;
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
    const warnings = "warnings" in res && Array.isArray(res.warnings) ? (res.warnings as string[]) : [];
    patch(job.id, {
      state: "done",
      titleId: res.id,
      warnings,
      message: res.duplicate ? "Already in the catalogue" : warnings.length ? `Saved. Add later: ${warnings.join(", ")}` : "Saved",
    });
  } catch (e) {
    active.delete(job.id);
    const cur = jobs.find((j) => j.id === job.id);
    if (!cur || cur.state === "paused") return;
    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    patch(job.id, offline
      ? { state: "waiting", message: "Waiting for connection" }
      : { state: "failed", message: e instanceof Error ? e.message : "Upload stopped. Press Retry." });
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
  navigator.serviceWorker?.addEventListener("message", (e) => {
    if ((e.data as { type?: string } | null)?.type === "lovan-resume-uploads") {
      jobs.filter((j) => j.state === "failed").forEach((j) => patch(j.id, { state: "waiting", message: "Waiting" }));
      pump();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void requestSync();
    else pump();
  });
  window.addEventListener("online", () => {
    jobs.filter((j) => j.state === "failed").forEach((j) => patch(j.id, { state: "waiting", message: "Waiting" }));
    pump();
  });
  window.addEventListener("offline", () => {
    void requestSync();
    jobs.filter((j) => j.state === "uploading").forEach((j) => {
      active.get(j.id)?.abort(false);
      active.delete(j.id);
      patch(j.id, { state: "waiting", message: "Waiting for connection" });
    });
  });
  // Restore the queue after an app restart.
  void db().then((d) => {
    const r = d.transaction("jobs", "readonly").objectStore("jobs").getAll();
    r.onsuccess = () => {
      const saved = (r.result as Job[]).filter((s) => !jobs.some((j) => j.id === s.id));
      if (!saved.length) return;
      for (const s of saved) {
        if (s.state === "uploading" || s.state === "saving") { s.state = "waiting"; s.message = "Resuming"; }
        jobs.push(s);
      }
      emit();
      pump();
    };
  }).catch(() => {});
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
