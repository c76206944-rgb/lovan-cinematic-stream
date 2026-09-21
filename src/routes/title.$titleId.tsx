import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Play, Plus, Share2 } from "lucide-react";
import { getTitle, titles } from "@/data/titles";
import { TitleCard } from "@/components/site/TitleCard";

export const Route = createFileRoute("/title/$titleId")({
  loader: ({ params }) => {
    const title = getTitle(params.titleId);
    if (!title) throw notFound();
    return { title };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Not found | LOVAN" }, { name: "robots", content: "noindex" }],
      };
    }
    const { title } = loaderData;
    return {
      meta: [
        { title: `${title.name} | LOVAN` },
        { name: "description", content: title.synopsis },
        { property: "og:title", content: `${title.name} | LOVAN` },
        { property: "og:description", content: title.synopsis },
      ],
    };
  },
  component: TitleDetails,
});

function TitleDetails() {
  const { title } = Route.useLoaderData();
  const related = titles
    .filter((t) => t.id !== title.id && t.genres.some((g) => title.genres.includes(g)))
    .slice(0, 8);

  return (
    <div className="pb-16">
      <section className="relative">
        <img
          src={title.image}
          alt=""
          width={1536}
          height={864}
          className="h-[58vh] min-h-[340px] w-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
      </section>

      <div className="mx-auto -mt-28 max-w-[1600px] px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-primary">Demo content</p>
            <h1 className="mt-3 text-3xl font-semibold text-foreground sm:text-5xl">
              {title.name}
            </h1>
            <p className="mt-3 text-xs text-muted-foreground">
              {title.year} · {title.runtime} · {title.maturity} · Rated {title.rating.toFixed(1)}
            </p>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {title.synopsis}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Play className="size-4" strokeWidth={1.5} />
                Play
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface"
              >
                <Plus className="size-4" strokeWidth={1.5} />
                Add to My List
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface"
              >
                <Share2 className="size-4" strokeWidth={1.5} />
                Share
              </button>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {title.genres.map((genre) => (
                <span
                  key={genre}
                  className="rounded-sm border border-border px-2.5 py-1 text-xs text-muted-foreground"
                >
                  {genre}
                </span>
              ))}
            </div>
          </div>

          <dl className="space-y-4 rounded-lg border border-border bg-surface p-6 text-sm">
            <Detail label="Type" value={title.kind} />
            <Detail label="Country" value={title.country} />
            <Detail label="Original language" value={title.language} />
            <Detail label="Director" value={title.director} />
            <Detail label="Cast" value={title.cast.join(", ")} />
            <Detail label="Audio" value={title.audio.join(", ")} />
            <Detail label="Subtitles" value={title.subtitles.join(", ")} />
            <Detail label="Plan" value={title.premium ? "Premium" : "Free with advertising"} />
          </dl>
        </div>

        {related.length > 0 ? (
          <section className="mt-14">
            <h2 className="text-lg font-semibold text-foreground">More like this</h2>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((item) => (
                <TitleCard key={item.id} title={item} />
              ))}
            </div>
          </section>
        ) : null}

        <p className="mt-10 text-xs text-muted-foreground">
          Availability depends on the rights held for your territory.{" "}
          <Link to="/help" className="text-primary">
            Read more
          </Link>
        </p>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-foreground capitalize-none">{value}</dd>
    </div>
  );
}
