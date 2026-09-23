// Offline copies are kept inside the app's private browser storage, encrypted with a
// device key that cannot be read out of the browser. The stored data is not a playable
// file, so it cannot be exported; it only plays inside LOVAN on this device.
const DB = "lovan-offline";
const STORE = "titles";
const KEYS = "keys";
export const OFFLINE_DAYS = 30;

type Stored = {
  id: string;
  name: string;
  bytes: number;
  savedAt: number;
  expiresAt: number;
  type: string;
  iv: Uint8Array;
  data: ArrayBuffer;
};
export type OfflineItem = Omit<Stored, "iv" | "data">;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (db.objectStoreNames.contains(STORE)) db.deleteObjectStore(STORE);
      db.createObjectStore(STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(KEYS)) db.createObjectStore(KEYS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest) {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const req = fn(db.transaction(store, mode).objectStore(store));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

async function deviceKey(): Promise<CryptoKey> {
  const found = await run<CryptoKey | undefined>(KEYS, "readonly", (s) => s.get("device"));
  if (found) return found;
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  await run(KEYS, "readwrite", (s) => s.put(key, "device"));
  return key;
}

const strip = ({ iv: _iv, data: _d, ...rest }: Stored): OfflineItem => rest;

export async function saveOffline(item: { id: string; name: string; blob: Blob }) {
  const key = await deviceKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, await item.blob.arrayBuffer());
  const now = Date.now();
  const row: Stored = {
    id: item.id,
    name: item.name,
    bytes: item.blob.size,
    savedAt: now,
    expiresAt: now + OFFLINE_DAYS * 86400000,
    type: item.blob.type || "video/mp4",
    iv,
    data,
  };
  await run(STORE, "readwrite", (s) => s.put(row));
}

export const removeOffline = (id: string) => run(STORE, "readwrite", (s) => s.delete(id));

export async function getOffline(id: string): Promise<OfflineItem | undefined> {
  const row = await run<Stored | undefined>(STORE, "readonly", (s) => s.get(id));
  if (!row) return undefined;
  if (row.expiresAt < Date.now()) {
    await removeOffline(id);
    return undefined;
  }
  return strip(row);
}

export async function listOffline(): Promise<OfflineItem[]> {
  const rows = await run<Stored[]>(STORE, "readonly", (s) => s.getAll());
  const live: OfflineItem[] = [];
  for (const row of rows) {
    if (row.expiresAt < Date.now()) await removeOffline(row.id);
    else live.push(strip(row));
  }
  return live;
}

/** Decrypts a saved title in memory for playback. Returns a temporary in-page address. */
export async function openForPlayback(id: string): Promise<string> {
  const row = await run<Stored | undefined>(STORE, "readonly", (s) => s.get(id));
  if (!row || row.expiresAt < Date.now()) throw new Error("This download has expired. Save it again.");
  const key = await deviceKey();
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: row.iv }, key, row.data);
  return URL.createObjectURL(new Blob([plain], { type: row.type }));
}

export async function downloadToApp(url: string, onProgress: (pct: number) => void): Promise<Blob> {
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
