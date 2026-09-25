import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { getConsent, setConsent, clearConsent, adsSeenToday, DAILY_AD_LIMIT, type Consent } from "@/lib/ads";

export const Route = createFileRoute("/ad-choices")({
  head: () => ({
    meta: [
      { title: "Ad choices | LOVAN" },
      {
        name: "description",
        content: "Choose whether adverts and advert notifications run on LOVAN, and change your choice at any time.",
      },
      { property: "og:title", content: "Ad choices | LOVAN" },
      {
        property: "og:description",
        content: "Choose whether adverts and advert notifications run on LOVAN.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdChoices,
});

function AdChoices() {
  const [consent, setLocal] = useState<Consent | null>(null);
  const [seen, setSeen] = useState(0);

  useEffect(() => {
    setLocal(getConsent());
    setSeen(adsSeenToday());
  }, []);

  const save = (ads: boolean, push: boolean) => {
    setLocal(setConsent({ ads, push }));
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <h1 className="font-display text-2xl font-semibold text-foreground">Ad choices</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        LOVAN is free to watch and is paid for by adverts. You decide whether adverts run on this device, and you can
        change it whenever you like. Adverts never run while a film is playing, and you see at most {DAILY_AD_LIMIT} a
        day.
      </p>

      <div className="mt-8 rounded-md border border-border p-4">
        <p className="text-sm text-foreground">
          Your choice: {consent ? (consent.ads ? "Adverts allowed" : "No adverts") : "Not set yet"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Advert notifications: {consent?.push ? "On" : "Off"}. Adverts seen today: {seen} of {DAILY_AD_LIMIT}.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => save(true, consent?.push ?? false)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Allow adverts
          </button>
          <button
            type="button"
            onClick={() => save(false, false)}
            className="rounded-md border border-input px-4 py-2 text-sm text-foreground"
          >
            Turn adverts off
          </button>
          <button
            type="button"
            onClick={() => save(consent?.ads ?? false, !(consent?.push ?? false))}
            className="rounded-md border border-input px-4 py-2 text-sm text-foreground"
          >
            {consent?.push ? "Turn advert notifications off" : "Turn advert notifications on"}
          </button>
          <button
            type="button"
            onClick={() => {
              clearConsent();
              setLocal(null);
            }}
            className="rounded-md px-3 py-2 text-sm text-muted-foreground"
          >
            Ask me again
          </button>
        </div>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        Turning advert notifications off takes effect the next time you open LOVAN. You can also block notifications for
        this site in your browser settings.
      </p>
    </div>
  );
}
