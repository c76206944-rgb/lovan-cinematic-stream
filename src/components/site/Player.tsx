import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Gauge, Maximize2, Subtitles } from "lucide-react";

type OrientationLock = { lock?: (o: string) => Promise<void>; unlock?: () => void };
type FullscreenVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };
type FullscreenBox = HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> };

export type SubtitleTrack = { label: string; lang: string; url: string };

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

/**
 * Video player with playback speed, subtitle choice, full screen and a way back.
 */
export function Player({
  src,
  tracks = [],
  onExit,
  startAt = 0,
  onProgress,
}: {
  src: string;
  tracks?: SubtitleTrack[];
  onExit?: () => void;
  startAt?: number;
  onProgress?: ((position: number, duration: number) => void) | undefined;
}) {
  const boxRef = useRef<FullscreenBox | null>(null);
  const videoRef = useRef<FullscreenVideo | null>(null);
  const lastSaved = useRef(0);
  const [full, setFull] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [subtitle, setSubtitle] = useState<string>("off");
  const [noPicture, setNoPicture] = useState(false);
  const [fill, setFill] = useState(false);
  const report = (v: HTMLVideoElement, force = false) => {
    if (!onProgress) return;
    const now = Date.now();
    if (!force && now - lastSaved.current < 10_000) return;
    lastSaved.current = now;
    onProgress(v.currentTime, v.duration);
  };

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
      // Some devices do not allow locking; rotation still works.
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

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.playbackRate = speed;
  }, [speed]);

  // Subtitle files are copied into the page so the browser never blocks them.
  const [local, setLocal] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    const made: string[] = [];
    void Promise.all(
      tracks.map(async (t) => {
        try {
          const text = await (await fetch(t.url)).text();
          const url = URL.createObjectURL(new Blob([text], { type: "text/vtt" }));
          made.push(url);
          return [t.lang, url] as const;
        } catch {
          return null;
        }
      }),
    ).then((pairs) => {
      if (!alive) return;
      setLocal(Object.fromEntries(pairs.filter((p): p is readonly [string, string] => Boolean(p))));
      // Like YouTube: turn on the viewer's last choice or their device language.
      const saved = localStorage.getItem("lovan-subtitle");
      if (saved === "off") return;
      const device = navigator.language.slice(0, 2).toLowerCase();
      const pick = tracks.find((t) => t.lang === saved) ?? tracks.find((t) => t.lang.slice(0, 2).toLowerCase() === device) ?? tracks[0];
      if (pick) setSubtitle(pick.lang);
    });
    return () => {
      alive = false;
      made.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [tracks]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const list = video.textTracks;
    for (let i = 0; i < list.length; i += 1) {
      const track = list[i];
      if (track) track.mode = track.language === subtitle ? "showing" : "disabled";
    }
  }, [subtitle, local]);

  const chooseSubtitle = (lang: string) => {
    setSubtitle(lang);
    setSubOpen(false);
    localStorage.setItem("lovan-subtitle", lang);
  };

  const leave = async () => {
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    onExit?.();
  };

  const chip =
    "inline-flex items-center gap-1.5 rounded-md border border-border bg-background/80 px-2.5 py-1.5 text-xs text-foreground";

  return (
    <div
      ref={boxRef}
      data-no-ads="true"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="relative isolate z-40 bg-black"
    >
      <div className={full ? "flex h-dvh w-full items-center justify-center bg-black" : "mx-auto aspect-video w-full max-w-[1600px]"}>
        <video
          ref={videoRef}
          src={src}
          controls
          autoPlay
          playsInline
          preload="auto"
          controlsList="nodownload"
          onContextMenu={(e) => e.preventDefault()}
          onLoadedMetadata={(e) => {
            setNoPicture(e.currentTarget.videoWidth === 0);
            if (startAt > 0) e.currentTarget.currentTime = startAt;
          }}
          onTimeUpdate={(e) => report(e.currentTarget)}
          onPause={(e) => report(e.currentTarget, true)}
          onEnded={(e) => report(e.currentTarget, true)}
          onPlaying={(e) => {
            const v = e.currentTarget as HTMLVideoElement & {
              getVideoPlaybackQuality?: () => { totalVideoFrames: number };
            };
            window.setTimeout(() => {
              if (v.paused) return;
              const frames = v.getVideoPlaybackQuality?.().totalVideoFrames;
              if (v.videoWidth === 0 || frames === 0) setNoPicture(true);
            }, 2500);
          }}
          className={`h-full w-full bg-black ${fill ? "object-cover" : "object-contain"}`}
        >
          {tracks.filter((t) => local[t.lang]).map((t) => (
            <track key={t.lang} kind="subtitles" src={local[t.lang]} srcLang={t.lang} label={t.label} />
          ))}
        </video>
      </div>
      {noPicture ? (
        <p className="absolute inset-x-4 bottom-16 rounded-md border border-border bg-background/90 p-3 text-center text-xs text-foreground">
          This browser can play the sound of this file but not its picture. The video uses a format (HEVC / x265) that many laptop browsers do not support. Try Safari or Microsoft Edge, or upload an H.264 version of this film.
        </p>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
        <button type="button" onClick={() => void leave()} className={`pointer-events-auto ${chip}`}>
          <ArrowLeft className="size-4" strokeWidth={1.5} />
          Back
        </button>
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="flex gap-2">
            {tracks.length > 0 ? (
              <button type="button" onClick={() => { setSubOpen((v) => !v); setSpeedOpen(false); }} className={chip}>
                <Subtitles className="size-4" strokeWidth={1.5} />
                Subtitles
              </button>
            ) : null}
            <button type="button" onClick={() => { setSpeedOpen((v) => !v); setSubOpen(false); }} className={chip}>
              <Gauge className="size-4" strokeWidth={1.5} />
              {speed}x
            </button>
            <button type="button" onClick={() => setFill((v) => !v)} aria-pressed={fill} className={chip}>
              {fill ? "Fill" : "Fit"}
            </button>
            <button type="button" onClick={() => void goFullscreen()} aria-label="Full screen" className={chip}>
              <Maximize2 className="size-4" strokeWidth={1.5} />
            </button>
          </div>
          {speedOpen ? (
            <div className="rounded-md border border-border bg-background p-1">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setSpeed(s); setSpeedOpen(false); }}
                  className={`block w-24 rounded px-2 py-1 text-left text-xs ${s === speed ? "text-primary" : "text-foreground"}`}
                >
                  {s === 1 ? "Normal" : `${s}x`}
                </button>
              ))}
            </div>
          ) : null}
          {subOpen ? (
            <div className="max-h-64 overflow-y-auto rounded-md border border-border bg-background p-1">
              <button
                type="button"
                onClick={() => chooseSubtitle("off")}
                className={`block w-40 rounded px-2 py-1 text-left text-xs ${subtitle === "off" ? "text-primary" : "text-foreground"}`}
              >
                Off
              </button>
              {tracks.map((t) => (
                <button
                  key={t.lang}
                  type="button"
                  onClick={() => chooseSubtitle(t.lang)}
                  className={`block w-40 rounded px-2 py-1 text-left text-xs ${subtitle === t.lang ? "text-primary" : "text-foreground"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
