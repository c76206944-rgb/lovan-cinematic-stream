import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { plans } from "@/data/titles";
import { PageHeading } from "@/components/site/TitleGrid";

export const Route = createFileRoute("/premium")({
  head: () => ({
    meta: [
      { title: "Premium | LOVAN" },
      {
        name: "description",
        content: "Remove advertising, unlock the highest available quality and watch on more devices.",
      },
      { property: "og:title", content: "Premium | LOVAN" },
      { property: "og:description", content: "LOVAN Premium: no ads, best quality, more devices." },
    ],
  }),
  component: PremiumPage,
});

function PremiumPage() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6">
      <PageHeading
        title="Premium"
        description="Prices are set per country and currency. Example prices shown in USD."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.name} className="rounded-lg border border-border bg-surface p-6">
            <h2 className="text-base font-semibold text-foreground">{plan.name}</h2>
            <p className="mt-3">
              <span className="font-display text-3xl text-foreground">
                {plan.currency} {plan.price}
              </span>{" "}
              <span className="text-xs text-muted-foreground">{plan.cadence}</span>
            </p>
            <ul className="mt-5 space-y-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={1.5} />
                  {feature}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-6 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Choose {plan.name}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
