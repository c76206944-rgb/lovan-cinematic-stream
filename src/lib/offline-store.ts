// Offline copies are kept inside the app's private browser storage.
// They are only playable inside LOVAN and are never saved as a file on the device.
const DB = "lovan-offline";
const STORE = "titles";

export type OfflineItem = { id: string; name: string; bytes: number; savedAt: number; blob: Blob };

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const saveOffline = (item: OfflineItem) => run("readwrite", (s) => s.put(item));
export const getOffline = (id: string) => run<OfflineItem | undefined>("readonly", (s) => s.get(id));
export const listOffline = () => run<OfflineItem[]>("readonly", (s) => s.getAll());
export const removeOffline = (id: string) => run("readwrite", (s) => s.delete(id));

export async function downloadToApp(
  url: string,
  onProgress: (pct: number) => void,
): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error("Download failed.");
  const total = Number(res.headers.get("content-length") ?? 0);
  const reader = res.body.getReader();
  const chunks: BlobPart[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value as BlobPart);
    loaded += value.byteLength;
    if (total) onProgress(Math.round((loaded / total) * 100));
  }
  return new Blob(chunks, { type: res.headers.get("content-type") ?? "video/mp4" });
}
