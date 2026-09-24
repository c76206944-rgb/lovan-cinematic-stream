import { Fragment } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { buildRails, collapseSeries } from "@/data/titles";
import { Rail } from "@/components/site/Rail";
import { AdSlot } from "@/components/site/AdSlot";
import { useCatalog } from "@/lib/use-catalog";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Home | LOVAN" },
      { name: "description", content: "The newest films and series on LOVAN." },
      { property: "og:title", content: "Home | LOVAN" },
      { property: "og:description", content: "The newest films and series on LOVAN." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://lovan.site/home" },
      { property: "og:image", content: "https://lovan.site/og-lovan.jpg?v=2" },
      { property: "og:image:secure_url", content: "https://lovan.site/og-lovan.jpg?v=2" },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "LOVAN" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://lovan.site/og-lovan.jpg?v=2" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { titles, loading } = useCatalog();
  const hero = collapseSeries(titles)[0];
  const rails = buildRails(titles);

  if (!hero) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 py-24 sm:px-6">
        <h1 className="text-2xl font-semibold text-foreground">{loading ? "Loading" : "Nothing to watch yet"}</h1>
        {!loading ? <p className="mt-3 text-sm text-muted-foreground">Published films and series will appear here.</p> : null}
      </div>
    );
  }

  return (
    <div className="pb-16">
      <section className="relative">
        <img src={hero.image} alt="" width={1536} height={864} className="h-[62vh] min-h-[380px] w-full object-cover opacity-55" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/65 to-transparent" />
        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto w-full max-w-[1600px] px-4 pb-10 sm:px-6">
            <p className="text-xs uppercase tracking-[0.3em] text-primary">New on LOVAN</p>
            <h1 className="mt-3 max-w-2xl break-words text-3xl font-semibold text-foreground sm:text-5xl">{hero.name}</h1>
            <p className="mt-2 text-xs text-muted-foreground">
              {[hero.year, hero.runtime, hero.country, hero.language, hero.maturity].filter(Boolean).join(" · ")}
            </p>
            {hero.synopsis ? <p className="mt-3 line-clamp-3 max-w-xl text-sm text-muted-foreground">{hero.synopsis}</p> : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/title/$titleId"
                params={{ titleId: hero.id }}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Play className="size-4" strokeWidth={1.5} />
                Play
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1600px]">
        {rails.map((rail, i) => (
          <Fragment key={rail.id}>
            <Rail rail={rail} />
            {i === 1 ? <AdSlot placement="banner" /> : null}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
