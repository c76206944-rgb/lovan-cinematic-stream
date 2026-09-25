import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AdminTabs, StaffGate } from "@/components/site/AdminTabs";
import { useAccount } from "@/lib/use-account";
import {
  DAILY_AD_LIMIT,
  ZONES,
  adEvents,
  adsSeenToday,
  adsAllowed,
  fillAdCount,
  getConsent,
  isStaffMode,
  loadedZones,
  multitagIsLoaded,
  onAdStateChange,
  resetAdCount,
  type AdEvent,
} from "@/lib/ads";

export const Route = createFileRoute("/_authenticated/admin_/diagnostics")({
  head: () => ({
    meta: [
      { title: "Ad diagnostics | LOVAN Studio" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Studio view of advert zones, daily cap use and delivery errors." },
    ],
  }),
  component: Diagnostics,
});

type Snapshot = {
  zones: string[];
  seen: number;
  allowed: boolean;
  staff: boolean;
  multitag: boolean;
  consent: string;
  push: string;
  events: AdEvent[];
};

function snapshot(): Snapshot {
  const c = getConsent();
  return {
    zones: loadedZones(),
    seen: adsSeenToday(),
    allowed: adsAllowed(),
    staff: isStaffMode(),
    multitag: multitagIsLoaded(),
    consent: c ? (c.ads ? "Adverts allowed" : "Adverts declined") : "Not answered yet",
    push: c?.push ? "On" : "Off",
    events: adEvents(),
  };
}

function Diagnostics() {
  const account = useAccount();
  const [state, setState] = useState<Snapshot | null>(null);
  const [sw, setSw] = useState("Checking");

  useEffect(() => {
    const sync = () => setState(snapshot());
    sync();
    const off = onAdStateChange(sync);
    const timer = window.setInterval(sync, 4000);
    return () => {
      off();
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      setSw("Not supported in this browser");
      return;
    }
    void navigator.serviceWorker.getRegistrations().then((list) => {
      if (!list.length) {
        setSw("No background helper registered");
        return;
      }
      const r = list[0];
      const push = r?.active?.scriptURL.includes("push=1") ? "with advert notifications" : "without advert notifications";
      setSw(`Active ${push}`);
    });
  }, []);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <AdminTabs />
      <StaffGate ready={account.ready} staff={account.staff} email={account.email}>
        <h1 className="mt-8 font-display text-xl font-semibold text-foreground">Ad diagnostics</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This is what adverts are doing on this device right now. Studio staff never see adverts, so most figures here
          stay at zero while you are signed in.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Card title="Daily cap">
            <Row label="Limit per person" value={String(DAILY_AD_LIMIT)} />
            <Row label="Seen today on this device" value={String(state?.seen ?? 0)} />
            <Row label="Adverts allowed right now" value={state?.allowed ? "Yes" : "No"} />
            <Row label="Resets" value="Midnight UTC" />
          </Card>

          <Card title="This account">
            <Row label="Signed in as" value={account.email ?? "Not signed in"} />
            <Row label="Studio staff" value={state?.staff ? "Yes, adverts off" : "No"} />
            <Row label="Viewer choice" value={state?.consent ?? ""} />
            <Row label="Advert notifications" value={state?.push ?? ""} />
          </Card>

          <Card title="Zones">
            {ZONES.map((z) => (
              <Row
                key={z.id}
                label={`${z.label} (${z.id})`}
                value={
                  z.id === "11883577"
                    ? sw.startsWith("Active with")
                      ? "Loaded"
                      : "Not loaded"
                    : state?.zones.includes(z.id)
                      ? "Loaded"
                      : "Not loaded"
                }
              />
            ))}
            <Row label="Page tags injected" value={state?.multitag ? "Once" : "Not yet"} />
          </Card>

          <Card title="Background helper">
            <Row label="Status" value={sw} />
            <Row label="Address" value="/sw.js" />
          </Card>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => resetAdCount()}
            className="rounded-md border border-input px-4 py-2 text-sm text-foreground"
          >
            Reset today's count
          </button>
          <button
            type="button"
            onClick={() => fillAdCount()}
            className="rounded-md border border-input px-4 py-2 text-sm text-foreground"
          >
            Set count to the cap
          </button>
        </div>

        <h2 className="mt-10 text-sm font-semibold text-foreground">Recent advert activity</h2>
        <div className="mt-3 rounded-md border border-border">
          {state && state.events.length ? (
            state.events.map((e, i) => (
              <div key={`${e.at}-${i}`} className="flex flex-wrap justify-between gap-2 border-b border-border px-4 py-2.5 text-sm last:border-b-0">
                <span className="text-foreground">Zone {e.zone}</span>
                <span className={e.status === "loaded" ? "text-muted-foreground" : "text-primary"}>{e.note}</span>
                <span className="text-xs text-muted-foreground">{new Date(e.at).toLocaleTimeString()}</span>
              </div>
            ))
          ) : (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Nothing recorded on this device. Advert activity only appears for viewers who are not studio staff.
            </p>
          )}
        </div>
      </StaffGate>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-border p-4">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <dl className="mt-3 space-y-2">{children}</dl>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}
