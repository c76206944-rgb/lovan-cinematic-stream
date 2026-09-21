import { createFileRoute, Link } from "@tanstack/react-router";
import { titles, plans } from "@/data/titles";
import { TitleCard } from "@/components/site/TitleCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LOVAN | Films, series and documentaries from everywhere" },
      {
        name: "description",
        content:
          "Watch films, series, documentaries and short films on LOVAN. Free with limited advertising, or Premium without ads.",
      },
      { property: "og:title", content: "LOVAN | Films, series and documentaries" },
      {
        property: "og:description",
        content: "Watch films, series, documentaries and short films on LOVAN.",
      },
    ],
  }),
  component: Landing,
});

const sections = [
  {
    title: "Discover",
    body: "Browse by genre, country and language. Availability follows the rights held for each territory.",
  },
  {
    title: "Watch",
    body: "Adaptive quality, multiple audio tracks and subtitles, resume where you stopped on any device.",
  },
  {
    title: "Create Your List",
    body: "Save titles to My List and keep a record of what you have already watched.",
  },
  {
    title: "Go Premium",
    body: "Remove advertising, unlock the highest available quality and early releases where licensed.",
  },
];

const faq = [
  {
    q: "Is LOVAN free?",
    a: "Yes. The free tier includes up to five ad placements per session. Premium removes advertising.",
  },
  {
    q: "Why is a title missing for me?",
    a: "Every title is licensed for specific territories. If the rights are not held where you are, the title is not shown.",
  },
  {
    q: "Which devices are supported?",
    a: "Any modern browser. Premium allows up to four devices on one account.",
  },
  {
    q: "Can I download titles?",
    a: "Offline viewing is available on Premium when the territory rights and your plan allow it.",
  },
];

function Landing() {
  const featured = titles[0];

  return (
    <div>
      <section className="relative">
        <img
          src={featured.image}
          alt=""
          width={1536}
          height={864}
          className="h-[70vh] min-h-[420px] w-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/10" />
        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto w-full max-w-[1600px] px-4 pb-12 sm:px-6">
            <p className="text-xs uppercase tracking-[0.3em] text-primary">Demo content</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-foreground sm:text-6xl">
              Cinema, wherever your story takes you.
            </h1>
            <p className="mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
              Films, series, documentaries and short films from filmmakers and rights holders
              around the world.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/home"
                className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Start watching
              </Link>
              <Link
                to="/premium"
                className="rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface"
              >
                See plans
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-4 py-16 sm:px-6">
        <div className="grid gap-10 border-t border-border pt-10 sm:grid-cols-2 lg:grid-cols-4">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{section.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-4 sm:px-6">
        <h2 className="text-xl font-semibold text-foreground">Featured titles</h2>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {titles.slice(0, 8).map((title) => (
            <TitleCard key={title.id} title={title} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-4 py-20 sm:px-6">
        <h2 className="text-xl font-semibold text-foreground">Plans</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Prices are set per country and currency. Example prices shown in USD.
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.name} className="rounded-lg border border-border bg-surface p-6">
              <h3 className="text-base font-semibold text-foreground">{plan.name}</h3>
              <p className="mt-3">
                <span className="font-display text-3xl text-foreground">
                  {plan.currency} {plan.price}
                </span>
                <span className="ml-2 text-xs text-muted-foreground">{plan.cadence}</span>
              </p>
              <ul className="mt-5 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="text-sm text-muted-foreground">
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-4 pb-20 sm:px-6">
        <h2 className="text-xl font-semibold text-foreground">Questions</h2>
        <dl className="mt-6 grid gap-6 sm:grid-cols-2">
          {faq.map((item) => (
            <div key={item.q} className="border-t border-border pt-4">
              <dt className="text-sm font-medium text-foreground">{item.q}</dt>
              <dd className="mt-2 text-sm text-muted-foreground">{item.a}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-10 text-xs text-muted-foreground">
          Support: help@lovan.example. Legal notices: legal@lovan.example. All artwork and titles
          shown are demo content.
        </p>
      </section>
    </div>
  );
}
