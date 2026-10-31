import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Gauge, Maximize2, Subtitles } from "lucide-react";
import { enterPlayback } from "@/lib/ads";

type OrientationLock = { lock?: (o: string) => Promise<void>; unlock?: () => void };
type FullscreenVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };
type FullscreenBox = HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> };

export type SubtitleTrack = { label: string; lang: string; url: string };
const NO_TRACKS: SubtitleTrack[] = [];

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

type AudioOption = { index: number; label: string; enabled: boolean };
type AudioTrackList = { length: number; [i: number]: { label: string; language: string; enabled: boolean } | undefined };

/** Picture modes run on the viewer's device: no extra data, no buffering. */
const PICTURE = {
  hd: { label: "HD Clarity", filter: "url(#lovan-sharpen) contrast(1.06) saturate(1.08)" },
  ultra: { label: "HD Clarity Max", filter: "url(#lovan-sharpen-max) contrast(1.08) saturate(1.1) brightness(1.02)" },
  normal: { label: "Original", filter: "none" },
  bright: { label: "Bright boost", filter: "brightness(1.15) contrast(1.05) saturate(1.05)" },
  vivid: { label: "Vivid and crisp", filter: "contrast(1.12) saturate(1.15) brightness(1.04)" },
} as const;
type PictureMode = keyof typeof PICTURE;

/**
 * Video player with playback speed, subtitle choice, full screen and a way back.
 */
export function Player({
  src,
  tracks = NO_TRACKS,
  onExit,
  startAt = 0,
  onProgress,
  next,
  title,
  episodeLabel,
}: {
  src: string;
  title?: string | undefined;
  episodeLabel?: string | undefined;
  tracks?: SubtitleTrack[];
  onExit?: () => void;
  startAt?: number;
  onProgress?: ((position: number, duration: number) => void) | undefined;
  /** Next episode, offered in the last minute and played when this one ends. */
  next?: { label: string; play: () => void } | undefined;
}) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [skipNext, setSkipNext] = useState(false);
  const boxRef = useRef<FullscreenBox | null>(null);
  const videoRef = useRef<FullscreenVideo | null>(null);
  const lastSaved = useRef(0);
  const [full, setFull] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [subtitle, setSubtitle] = useState<string>("off");
  const [noPicture, setNoPicture] = useState(false);
  // Fit shows the whole picture; Full fills the screen while keeping the subtitle zone visible; Stretch fills without cropping.
  const [fit, setFit] = useState<"fit" | "full" | "stretch">("full");
  const [audioOpen, setAudioOpen] = useState(false);
  const [audioList, setAudioList] = useState<AudioOption[]>([]);
  const [pictureOpen, setPictureOpen] = useState(false);
  const [picture, setPicture] = useState<PictureMode>("hd");
  // Controls fade out while playing so the film fills a clean screen; a tap brings them back.
  const [shown, setShown] = useState(true);
  const hideTimer = useRef<number | null>(null);
  const wake = () => {
    setShown(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShown(false);
    }, 3000);
  };
  useEffect(() => () => { if (hideTimer.current) window.clearTimeout(hideTimer.current); }, []);
  useEffect(() => enterPlayback(), []);
  useEffect(() => {
    const saved = localStorage.getItem("lovan-picture") as PictureMode | null;
    if (saved && saved in PICTURE) setPicture(saved);
  }, []);
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
    const onSeek = (e: Event) => {
      const v = videoRef.current;
      const sec = (e as CustomEvent<number>).detail;
      if (!v || !Number.isFinite(sec)) return;
      v.currentTime = sec;
      void v.play().catch(() => {});
      boxRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    window.addEventListener("lovan-seek", onSeek);
    return () => window.removeEventListener("lovan-seek", onSeek);
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
          const raw = await (await fetch(t.url)).text();
          // Lift cues one line off the bottom so phone control bars never cover them.
          const text = raw.replace(/^(\s*[\d:.]+\s+-->\s+[\d:.]+)([^\n]*)$/gm, (m, time: string, rest: string) =>
            /\bline:/.test(rest) ? m : `${time}${rest} line:-2`,
          );
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
      // Turn on the viewer's last choice, otherwise English, otherwise the first track.
      const saved = localStorage.getItem("lovan-subtitle");
      if (saved === "off") return;
      const pick = tracks.find((t) => t.lang === saved) ?? tracks.find((t) => t.lang.slice(0, 2).toLowerCase() === "en") ?? tracks[0];
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

  const readAudio = () => {
    const list = (videoRef.current as (HTMLVideoElement & { audioTracks?: AudioTrackList }) | null)?.audioTracks;
    if (!list) return setAudioList([]);
    const out: AudioOption[] = [];
    for (let i = 0; i < list.length; i += 1) {
      const t = list[i];
      if (!t) continue;
      out.push({ index: i, label: t.label || t.language || `Track ${i + 1}`, enabled: t.enabled });
    }
    setAudioList(out);
  };

  const chooseAudio = (index: number) => {
    const list = (videoRef.current as (HTMLVideoElement & { audioTracks?: AudioTrackList }) | null)?.audioTracks;
    if (!list) return;
    for (let i = 0; i < list.length; i += 1) {
      const t = list[i];
      if (t) t.enabled = i === index;
    }
    readAudio();
    setAudioOpen(false);
  };

  // Android can hand the stream to MX Player or VLC, which can switch any language in the file.
  const externalUrl = /^https?:\/\//.test(src) ? src : null;
  const intentFor = (pkg: string) => {
    if (!externalUrl) return "#";
    const u = new URL(externalUrl);
    return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${u.protocol.replace(":", "")};type=video/*;package=${pkg};end`;
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
      onPointerDown={(e) => { e.stopPropagation(); wake(); }}
      onPointerMove={wake}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      className="relative isolate z-40 bg-black"
    >
      {/* Sharpening filters that make low resolution films look crisper on the viewer's phone. */}
      <svg aria-hidden="true" width="0" height="0" className="absolute">
        <filter id="lovan-sharpen">
          <feConvolveMatrix order="3" preserveAlpha="true" kernelMatrix="0 -0.5 0 -0.5 3 -0.5 0 -0.5 0" />
        </filter>
        <filter id="lovan-sharpen-max">
          <feConvolveMatrix order="3" preserveAlpha="true" kernelMatrix="0 -1 0 -1 5 -1 0 -1 0" />
        </filter>
      </svg>
      <div className={`relative overflow-hidden ${full ? "flex h-dvh w-full items-center justify-center bg-black" : "mx-auto aspect-video w-full max-w-[1600px]"}`}>
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
            readAudio();
          }}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            report(v);
            if (next && v.duration > 120) {
              const left = v.duration - v.currentTime;
              setRemaining(left <= 60 ? Math.ceil(left) : null);
            }
          }}
          onPause={(e) => { report(e.currentTarget, true); setShown(true); }}
          onPlay={wake}
          onEnded={(e) => {
            report(e.currentTarget, true);
            if (next && !skipNext) next.play();
          }}
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
          style={{ filter: PICTURE[picture].filter }}
          className={`h-full w-full bg-black ${fit === "full" ? "object-cover object-[center_100%]" : fit === "stretch" ? "object-fill" : "object-contain"}`}
        >
          {tracks.filter((t) => local[t.lang]).map((t) => (
            <track key={t.lang} kind="subtitles" src={local[t.lang]} srcLang={t.lang} label={t.label} />
          ))}
        </video>
        <WatermarkShield videoRef={videoRef} fit={fit} />
      </div>
      {next && remaining !== null && !skipNext ? (
        <div className="absolute bottom-16 right-3 z-10 flex items-center gap-3 rounded-md border border-primary bg-background/90 p-3 text-xs text-foreground">
          <span>Next: {next.label} in {remaining}s</span>
          <button type="button" onClick={next.play} className="rounded bg-primary px-2.5 py-1 font-medium text-primary-foreground">Play now</button>
          <button type="button" onClick={() => setSkipNext(true)} className="text-muted-foreground">Cancel</button>
        </div>
      ) : null}
      {noPicture ? (
        <p className="absolute inset-x-4 bottom-16 rounded-md border border-border bg-background/90 p-3 text-center text-xs text-foreground">
          This browser can play the sound of this file but not its picture. The video uses a format (HEVC / x265) that many laptop browsers do not support. Try Safari or Microsoft Edge, or upload an H.264 version of this film.
        </p>
      ) : null}

      <div style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))", paddingLeft: "max(0.5rem, env(safe-area-inset-left))", paddingRight: "max(0.5rem, env(safe-area-inset-right))" }} className={`pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2 transition-opacity duration-300 motion-reduce:transition-none sm:p-3 ${shown || speedOpen || subOpen || audioOpen || pictureOpen ? "opacity-100" : "invisible opacity-0"}`}>
        <div className="flex min-w-0 max-w-[45%] flex-col items-start gap-1">
        <button type="button" onClick={() => void leave()} className={`pointer-events-auto ${chip}`}>
          <ArrowLeft className="size-4" strokeWidth={1.5} />
          Back
        </button>
        {title ? <div className="max-w-full rounded-sm bg-background/80 px-2 py-1 text-xs text-foreground"><p className="break-words">{title}</p>{episodeLabel ? <p className="mt-1 font-semibold text-primary">{episodeLabel}</p> : null}</div> : null}
        </div>
        <div className="pointer-events-auto flex min-w-0 flex-col items-end gap-2">
          <div className="flex flex-wrap justify-end gap-1.5">
            {tracks.length > 0 ? (
              <button
                type="button"
                aria-label="Choose subtitles"
                aria-pressed={subtitle !== "off"}
                onClick={() => { setSubOpen((v) => !v); setSpeedOpen(false); }}
                className={`${chip} font-semibold ${subtitle !== "off" ? "border-primary text-primary" : ""}`}
              >
                <Subtitles className="size-4" strokeWidth={1.5} />
                CC
              </button>
            ) : null}
            <button type="button" onClick={() => { setAudioOpen((v) => !v); setSubOpen(false); setSpeedOpen(false); setPictureOpen(false); }} className={chip}>
              Audio
            </button>
            <button
              type="button"
              aria-pressed={picture !== "normal" && picture !== "hd"}
              onClick={() => { setPictureOpen((v) => !v); setSubOpen(false); setSpeedOpen(false); setAudioOpen(false); }}
              className={`${chip} ${picture !== "normal" && picture !== "hd" ? "border-primary text-primary" : ""}`}
            >
              Picture
            </button>
            <button type="button" onClick={() => { setSpeedOpen((v) => !v); setSubOpen(false); setAudioOpen(false); setPictureOpen(false); }} className={chip}>
              <Gauge className="size-4" strokeWidth={1.5} />
              {speed}x
            </button>
            <button
              type="button"
              onClick={() => setFit((v) => (v === "fit" ? "full" : v === "full" ? "stretch" : "fit"))}
              aria-label="Change picture size"
              className={`${chip} ${fit !== "fit" ? "border-primary text-primary" : ""}`}
            >
              {fit === "fit" ? "Fit" : fit === "full" ? "Full" : "Stretch"}
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
          {audioOpen ? (
            <div className="w-56 rounded-md border border-border bg-background p-1">
              {audioList.length > 1 ? (
                audioList.map((a) => (
                  <button
                    key={a.index}
                    type="button"
                    onClick={() => chooseAudio(a.index)}
                    className={`block w-full rounded px-2 py-1 text-left text-xs ${a.enabled ? "text-primary" : "text-foreground"}`}
                  >
                    {a.label}
                  </button>
                ))
              ) : (
                <p className="px-2 py-1 text-xs text-muted-foreground">
                  This browser shows one language only. Open the film in MX Player or VLC to switch language.
                </p>
              )}
              {externalUrl ? (
                <>
                  <a href={intentFor("com.mxtech.videoplayer.ad")} className="mt-1 block rounded px-2 py-1 text-xs text-foreground">Play in MX Player</a>
                  <a href={intentFor("org.videolan.vlc")} className="block rounded px-2 py-1 text-xs text-foreground">Play in VLC</a>
                </>
              ) : null}
            </div>
          ) : null}
          {pictureOpen ? (
            <div className="rounded-md border border-border bg-background p-1">
              {(Object.keys(PICTURE) as PictureMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setPicture(m); setPictureOpen(false); localStorage.setItem("lovan-picture", m); }}
                  className={`block w-40 rounded px-2 py-1 text-left text-xs ${m === picture ? "text-primary" : "text-foreground"}`}
                >
                  {PICTURE[m].label}
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
