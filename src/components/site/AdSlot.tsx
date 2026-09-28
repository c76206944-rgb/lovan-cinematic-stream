import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Play } from "lucide-react";

import { adsAllowed, isStaffMode, onAdStateChange } from "@/lib/ads";
import still from "@/assets/still-04.jpg";

/**
 * A stable in-app sponsor banner beside the page-level advert formats.
 *
 * The Monetag tags are page level: they are loaded once by the app shell and
 * place their own formats. This banner avoids leaving an empty box while those
 * formats load. It disappears for studio staff and once the daily cap is
 * reached, and contains no third-party code that can intercept scrolling.
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
      aria-label="LOVAN advertisement"
      data-ad-placement={placement}
      style={{ touchAction: "pan-y" }}
      className={`relative z-0 mx-4 my-8 isolate overflow-hidden rounded-md border border-border bg-surface sm:mx-6 ${
        placement === "banner" ? "min-h-28" : "min-h-40"
      }`}
    >
      <img
        src={still}
        alt="A fishing boat crossing the sea at night"
        className="absolute inset-0 -z-20 size-full object-cover opacity-55"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/85 to-background/20" />
      <div className="flex min-h-[inherit] items-center justify-between gap-5 px-5 py-5 sm:px-8">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary">LOVAN presentation</p>
          <p className="mt-1 max-w-md font-display text-lg font-semibold text-foreground sm:text-xl">
            Your next story is waiting
          </p>
          <p className="mt-1 hidden text-xs text-muted-foreground sm:block">Explore films and series selected for you.</p>
        </div>
        <Link
          to="/explore"
          className="inline-flex shrink-0 items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 sm:px-4 sm:text-sm"
        >
          <Play className="size-4" strokeWidth={1.5} />
          Explore
        </Link>
      </div>
    </aside>
  );
}
