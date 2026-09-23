import { useEffect, useRef, useState } from "react";
import { Maximize2 } from "lucide-react";

type OrientationLock = { lock?: (o: string) => Promise<void>; unlock?: () => void };
type FullscreenVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };
type FullscreenBox = HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> };

/**
 * Video player that opens full screen and follows the phone's rotation.
 * Turning the phone sideways while watching opens full screen automatically.
 */
export function Player({ src }: { src: string }) {
  const boxRef = useRef<FullscreenBox | null>(null);
  const videoRef = useRef<FullscreenVideo | null>(null);
  const [full, setFull] = useState(false);

  const goFullscreen = async () => {
    const box = boxRef.current;
    const video = videoRef.current;
    try {
      if (box?.requestFullscreen) await box.requestFullscreen();
      else if (box?.webkitRequestFullscreen) await box.webkitRequestFullscreen();
      else video?.webkitEnterFullscreen?.();
    } catch {
      video?.webkitEnterFullscreen?.();
    }
    const orientation = screen.orientation as unknown as OrientationLock;
    try {
      await orientation?.lock?.("landscape");
    } catch {
      // Orientation locking is not allowed on every device; rotation still works.
    }
  };

  useEffect(() => {
    const onChange = () => {
      const active = Boolean(document.fullscreenElement);
      setFull(active);
      if (!active) (screen.orientation as unknown as OrientationLock)?.unlock?.();
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    // Rotating the phone to landscape while playing opens full screen.
    const media = window.matchMedia("(orientation: landscape)");
    const onRotate = (event: MediaQueryListEvent) => {
      const video = videoRef.current;
      if (!video || video.paused) return;
      if (event.matches && !document.fullscreenElement) void goFullscreen();
      if (!event.matches && document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    };
    media.addEventListener("change", onRotate);
    return () => media.removeEventListener("change", onRotate);
  }, []);

  return (
    <div ref={boxRef} className="relative bg-background">
      <video
        ref={videoRef}
        src={src}
        controls
        autoPlay
        playsInline
        controlsList="nodownload"
        onContextMenu={(e) => e.preventDefault()}
        className={`mx-auto w-full bg-background ${full ? "h-dvh object-contain" : "max-h-[80vh] max-w-[1600px]"}`}
      />
      <button
        type="button"
        onClick={() => void goFullscreen()}
        aria-label="Full screen"
        className="absolute right-3 top-3 rounded-md border border-border bg-background/80 p-2 text-foreground"
      >
        <Maximize2 className="size-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}
