import { useEffect, useState } from "react";

import { getConsent, setConsent, isStaffMode } from "@/lib/ads";

/**
 * Asks the viewer before any advert code or notification runs.
 * Nothing loads until a choice is made here.
 */
export function ConsentBanner() {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);
  const [push, setPush] = useState(false);

  useEffect(() => {
    if (isStaffMode()) return;
    if (window.self !== window.top) return;
    if (getConsent()) return;
    const t = window.setTimeout(() => setOpen(true), 800);
    return () => window.clearTimeout(t);
  }, []);

  if (!open) return null;

  const choose = (ads: boolean, allowPush: boolean) => {
    setConsent({ ads, push: allowPush });
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Advert and notification choices"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:px-6"
    >
      <div className="mx-auto max-w-[1100px]">
        <p className="text-sm text-foreground">
          LOVAN is free to watch and is paid for by adverts.
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Choose whether adverts may run while you watch. You can change this at any time on the Ad choices page.
        </p>

        {details ? (
          <label className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={push}
              onChange={(e) => setPush(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[color:var(--primary)]"
            />
            <span>Also send me notifications from advert partners. This is off unless you tick it.</span>
          </label>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => choose(true, details ? push : false)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Accept adverts
          </button>
          <button
            type="button"
            onClick={() => choose(false, false)}
            className="rounded-md border border-input px-4 py-2 text-sm text-foreground"
          >
            No adverts
          </button>
          {!details ? (
            <button
              type="button"
              onClick={() => setDetails(true)}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground"
            >
              More choices
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
