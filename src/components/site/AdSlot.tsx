import { useEffect, useState } from "react";

import { adsAllowed, isStaffMode, onAdStateChange } from "@/lib/ads";

/**
 * Reserved space for an advert.
 *
 * The Monetag tags are page level: they are loaded once by the app shell and
 * place their own formats. This box only reserves the space and disappears for
 * studio staff, for viewers who declined adverts, and once the daily cap is
 * reached, so nothing here can interfere with scrolling or playback.
 */
export function AdSlot({ placement }: { placement: "banner" | "sponsored_card" }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const sync = () => setActive(adsAllowed() && !isStaffMode());
    sync();
    return onAdStateChange(sync);
  }, []);

  if (!active) return null;

  return (
    <aside
      aria-label="Advertisement"
      data-ad-placement={placement}
      style={{ touchAction: "pan-y" }}
      className={`relative z-0 mx-4 my-8 flex items-center justify-center overflow-hidden rounded-md border border-dashed border-border sm:mx-6 ${
        placement === "banner" ? "min-h-24" : "min-h-40"
      }`}
    >
      <span className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Advertisement</span>
    </aside>
  );
}
