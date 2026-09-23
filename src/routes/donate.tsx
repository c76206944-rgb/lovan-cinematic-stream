import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeading } from "@/components/site/TitleGrid";

export const Route = createFileRoute("/donate")({
  head: () => ({
    meta: [
      { title: "Donate | LOVAN" },
      { name: "description", content: "Support LOVAN with a donation and unlock Premium: no ads, best quality, more devices." },
      { property: "og:title", content: "Donate | LOVAN" },
      { property: "og:description", content: "Support LOVAN and get Premium." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DonatePage,
});

const OPTIONS = [
  { id: "monthly", label: "Monthly donation", amount: 7, note: "Premium while your donation is active" },
  { id: "yearly", label: "Yearly donation", amount: 70, note: "Premium for a full year" },
  { id: "once", label: "One time donation", amount: 10, note: "Premium for 30 days" },
] as const;

function DonatePage() {
  const [choice, setChoice] = useState<string>("monthly");
  const [custom, setCustom] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <PageHeading
        title="Donate"
        description="LOVAN runs on donations. Donors get Premium: no adverts, the highest available quality, more devices and offline viewing where the rights allow."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setChoice(o.id)}
            className={`rounded-lg border p-5 text-left ${choice === o.id ? "border-primary bg-surface" : "border-border"}`}
          >
            <p className="text-sm text-foreground">{o.label}</p>
            <p className="mt-2 font-display text-2xl text-foreground">USD {o.amount}</p>
            <p className="mt-2 text-xs text-muted-foreground">{o.note}</p>
          </button>
        ))}
      </div>
      <label className="mt-6 block max-w-xs space-y-1">
        <span className="text-xs text-muted-foreground">Or give a different amount (USD)</span>
        <input
          inputMode="decimal"
          value={custom}
          onChange={(e) => setCustom(e.target.value.replace(/[^\d.]/g, ""))}
          placeholder="25"
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
      </label>
      <button
        type="button"
        onClick={() => setSent(true)}
        className="mt-6 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
      >
        Donate
      </button>
      {sent ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Card payments are being connected. Donations will open here very soon.
        </p>
      ) : null}
      <p className="mt-10 text-xs text-muted-foreground">
        Prices can differ by country and currency. Questions? See <Link to="/help" className="text-primary">Help</Link>.
      </p>
    </div>
  );
}
