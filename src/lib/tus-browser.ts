// The resumable upload library pulls in Node-only file locking helpers, which crash
// the edge server runtime. Loading it lazily keeps it out of the server bundle.
export type TusUpload = {
  start: () => void;
  abort: () => Promise<void>;
  findPreviousUploads: () => Promise<unknown[]>;
  resumeFromPreviousUpload: (prev: unknown) => void;
};

type TusModule = { Upload: new (file: File, options: Record<string, unknown>) => TusUpload };

let cached: Promise<TusModule> | null = null;

export function loadTus(): Promise<TusModule> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Uploads only run in the browser."));
  }
  if (!cached) cached = import("tus-js-client") as unknown as Promise<TusModule>;
  return cached;
}
