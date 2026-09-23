import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeading } from "@/components/site/TitleGrid";
import { listOffline, removeOffline, type OfflineItem } from "@/lib/offline-store";

export const Route = createFileRoute("/downloads")({
  head: () => ({
    meta: [
      { title: "Downloads | LOVAN" },
      { name: "description", content: "Films and series you saved to watch offline inside LOVAN." },
      { property: "og:title", content: "Downloads | LOVAN" },
      { property: "og:description", content: "Watch saved LOVAN titles without a connection." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DownloadsPage,
});

function DownloadsPage() {
  const [items, setItems] = useState<OfflineItem[] | null>(null);
  const [playing, setPlaying] = useState<{ id: string; url: string } | null>(null);

  const load = () => void listOffline().then(setItems).catch(() => setItems([]));
  useEffect(load, []);
  useEffect(() => () => { if (playing) URL.revokeObjectURL(playing.url); }, [playing]);

  const play = (item: OfflineItem) => setPlaying({ id: item.id, url: URL.createObjectURL(item.blob) });

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6">
      <PageHeading
        title="Downloads"
        description="Saved titles play here without a connection. They stay inside LOVAN on this device and cannot be exported or shared."
      />
      {playing ? (
        <video
          key={playing.id}
          src={playing.url}
          controls
          autoPlay
          controlsList="nodownload noremoteplayback"
          disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
          className="mb-8 aspect-video w-full rounded-lg bg-surface"
        />
      ) : null}
      {items === null ? (
        <p className="text-sm text-muted-foreground">Loading.</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing saved yet. Open a title and choose Watch offline.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="text-sm text-foreground">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(item.bytes / 1024 / 1024).toFixed(0)} MB · saved {new Date(item.savedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => play(item)} className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground">
                  Play
                </button>
                <button
                  type="button"
                  onClick={() => void removeOffline(item.id).then(() => { setPlaying(null); load(); })}
                  className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
