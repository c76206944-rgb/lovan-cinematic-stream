import { useEffect, useRef, useState } from "react";

import { AD_TAG_SRC, BANNER_ZONE, adsAllowed, countAd } from "@/lib/ads";

/**
 * Reserved space for an advert. Loads the ad zone only while the viewer is
 * under the daily cap, and never while a video is playing.
 */
export function AdSlot({ placement }: { placement: "banner" | "sponsored_card" }) {
  const host = useRef<HTMLDivElement>(null);
  const counted = useRef(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!adsAllowed()) return;
    if (document.querySelector("video:not([paused])")) return;
    const node = host.current;
    if (!node) return;
    if (!counted.current) {
      if (!countAd()) return;
      counted.current = true;
    }

    const s = document.createElement("script");
    s.src = AD_TAG_SRC;
    s.async = true;
    s.dataset["zone"] = BANNER_ZONE;
    s.setAttribute("data-cfasync", "false");
    node.appendChild(s);
    setShow(true);

    return () => {
      node.innerHTML = "";
    };
  }, []);

  return (
    <aside
      aria-label="Advertisement"
      data-ad-placement={placement}
      className={`relative z-0 mx-4 my-8 overflow-hidden rounded-md border border-dashed border-border sm:mx-6 ${placement === "banner" ? "min-h-24" : "min-h-40"}`}
    >
      <div
        ref={host}
        className="flex w-full items-center justify-center"
        style={{ minHeight: placement === "banner" ? 96 : 160 }}
      />
      {!show ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          Advertisement
        </span>
      ) : null}
    </aside>
  );
}
