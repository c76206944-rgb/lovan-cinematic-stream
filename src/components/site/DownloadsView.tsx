import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { listOffline, openForPlayback, removeOffline, type OfflineItem } from "@/lib/offline-store";
import { Player } from "./Player";

/** Shared by the normal route and the independent, network-free offline entry. */
export function DownloadsView() {
  const [items, setItems] = useState<OfflineItem[] | null>(null);
  const [playing, setPlaying] = useState<{ id: string; url: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = () => void listOffline().then(setItems).catch(() => { setItems([]); setErr("Saved downloads could not be opened on this device."); });
  useEffect(load, []);
  useEffect(() => () => { if (playing) URL.revokeObjectURL(playing.url); }, [playing]);
  const play = (item: OfflineItem) => void openForPlayback(item.id)
    .then((url) => { setErr(null); setPlaying({ id: item.id, url }); })
    .catch((e: unknown) => setErr(e instanceof Error ? e.message : "Could not play this download."));
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6">
      <header className="mb-8"><h1 className="text-2xl font-semibold sm:text-3xl">Downloads</h1></header>
      {err ? <p role="alert" className="mb-4 text-sm text-primary">{err}</p> : null}
      {playing ? <div className="mb-8 overflow-hidden rounded-lg"><Player key={playing.id} src={playing.url} onExit={() => setPlaying(null)} /></div> : null}
      {items === null ? <p className="text-sm text-muted-foreground">Loading.</p> : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing saved yet.</p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {items.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div className="min-w-0 flex-1"><p className="break-words text-sm">{item.name}</p><p className="mt-1 text-xs text-muted-foreground">{(item.bytes / 1024 / 1024).toFixed(0)} MB · saved {new Date(item.savedAt).toLocaleDateString()}</p></div>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" onClick={() => play(item)}>Play</Button>
              <Button size="sm" variant="outline" onClick={() => void removeOffline(item.id).then(() => { if (playing?.id === item.id) setPlaying(null); load(); }).catch(() => setErr("Could not remove this download."))}>Remove</Button>
            </div>
          </li>)}
        </ul>
      )}
    </div>
  );
}