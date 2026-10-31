import { useEffect, useState, type RefObject } from "react";

type Fit = "fit" | "full" | "stretch";

/** Where the KissKH-style corner mark sits, as a share of the picture. */
export const SHIELD_ZONE = { left: 0.8, top: 0, width: 0.13, height: 0.075 };

/** Position of the shield in element pixels, given the picture size and fit mode. */
export function shieldRect(W: number, H: number, vw: number, vh: number, fit: Fit) {
  if (!W || !H || !vw || !vh) return null;
  let sx: number, sy: number, ox: number, oy: number;
  if (fit === "stretch") {
    sx = W / vw; sy = H / vh; ox = 0; oy = 0;
  } else {
    const s = fit === "full" ? Math.max(W / vw, H / vh) : Math.min(W / vw, H / vh);
    sx = sy = s;
    ox = (W - vw * s) / 2;
    oy = fit === "full" ? H - vh * s : (H - vh * s) / 2;
  }
  return {
    left: ox + SHIELD_ZONE.left * vw * sx,
    top: oy + SHIELD_ZONE.top * vh * sy,
    width: SHIELD_ZONE.width * vw * sx,
    height: SHIELD_ZONE.height * vh * sy,
  };
}

export function WatermarkShield({ videoRef, fit }: { videoRef: RefObject<HTMLVideoElement | null>; fit: Fit }) {
  const [rect, setRect] = useState<ReturnType<typeof shieldRect>>(null);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const update = () => setRect(shieldRect(v.clientWidth, v.clientHeight, v.videoWidth, v.videoHeight, fit));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(v);
    v.addEventListener("loadedmetadata", update);
    v.addEventListener("resize", update);
    return () => { ro.disconnect(); v.removeEventListener("loadedmetadata", update); v.removeEventListener("resize", update); };
  }, [videoRef, fit]);
  if (!rect) return null;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute flex items-center justify-center bg-black"
      style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
    >
      <span className="font-semibold tracking-[0.2em] text-primary/80" style={{ fontSize: Math.max(8, rect.height * 0.45) }}>LOVAN</span>
    </div>
  );
}
