import { createFileRoute, Link } from "@tanstack/react-router";
import { Play, Plus } from "lucide-react";
import { homeRails, titles } from "@/data/titles";
import { Rail } from "@/components/site/Rail";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Home | LOVAN" },
      {
        name: "description",
        content: "Continue watching, trending titles and new releases available to you on LOVAN.",
      },
      { property: "og:title", content: "Home | LOVAN" },
      {
        property: "og:description",
        content: "Continue watching, trending titles and new releases on LOVAN.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const hero = titles[4] as (typeof titles)[number];

  return (
    <div className="pb-16">
      <section className="relative">
        <img
          src={hero.image}
          alt=""
          width={1536}
          height={864}
          className="h-[62vh] min-h-[380px] w-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/65 to-transparent" />
        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto w-full max-w-[1600px] px-4 pb-10 sm:px-6">
            <p className="text-xs uppercase tracking-[0.3em] text-primary">Featured</p>
            <h1 className="mt-3 max-w-2xl text-3xl font-semibold text-foreground sm:text-5xl">
              {hero.name}
            </h1>
            <p className="mt-2 text-xs text-muted-foreground">
              {hero.year} · {hero.runtime} · {hero.country} · {hero.language} · {hero.maturity}
            </p>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">{hero.synopsis}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/title/$titleId"
                params={{ titleId: hero.id }}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Play className="size-4" strokeWidth={1.5} />
                Play
              </Link>
              <Link
                to="/my-list"
                className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface"
              >
                <Plus className="size-4" strokeWidth={1.5} />
                My List
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1600px]">
        {homeRails.map((rail) => (
          <Rail key={rail.id} rail={rail} />
        ))}
      </div>
    </div>
  );
}
