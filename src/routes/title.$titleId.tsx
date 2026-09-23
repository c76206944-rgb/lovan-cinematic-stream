import { useEffect, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Download, Play, Plus, Share2 } from "lucide-react";
import { getTitle, titles, type Title } from "@/data/titles";
import { TitleCard } from "@/components/site/TitleCard";
import { Comments } from "@/components/site/Comments";
import { getOfflineVideoUrl, getPublicCatalogTitle } from "@/lib/offline.functions";
import { downloadToApp, getOffline, saveOffline } from "@/lib/offline-store";
import { useAccount } from "@/lib/use-account";
import still01 from "@/assets/still-01.jpg";

type ViewTitle = Title & { demo: boolean; canDownload: boolean };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/title/$titleId")({
  loader: async ({ params }): Promise<{ title: ViewTitle }> => {
    const demo = getTitle(params.titleId);
    if (demo) return { title: { ...demo, demo: true, canDownload: false } };
    if (!UUID.test(params.titleId)) throw notFound();
    const row = await getPublicCatalogTitle({ data: { id: params.titleId } });
    if (!row) throw notFound();
    return {
      title: {
        id: row.id,
        name: row.kind === "series" && row.series_name ? `${row.series_name}: ${row.name}` : row.name,
        year: row.year,
        kind: row.kind === "series" ? "series" : "movie",
        country: row.country,
        language: row.language,
        genres: row.genres,
        runtime: row.runtime,
        rating: 0,
        maturity: row.maturity,
        premium: row.premium,
        image: still01,
        synopsis: row.synopsis,
        director: row.director,
        cast: row.cast_members,
        audio: [row.language],
        subtitles: [],
        demo: false,
        canDownload: row.canDownload,
      },
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Not found | LOVAN" }, { name: "robots", content: "noindex" }] };
    }
    const { title } = loaderData;
    return {
      meta: [
        { title: `${title.name} | LOVAN` },
        { name: "description", content: title.synopsis },
        { property: "og:title", content: `${title.name} | LOVAN` },
        { property: "og:description", content: title.synopsis },
        { property: "og:type", content: "video.other" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: TitleDetails,
});

function DownloadButton({ title }: { title: ViewTitle }) {
  const account = useAccount();
  const getUrl = useServerFn(getOfflineVideoUrl);
  const [state, setState] = useState<"idle" | "saved" | "busy">("idle");
  const [pct, setPct] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!title.canDownload) return;
    void getOffline(title.id).then((item) => item && setState("saved"));
  }, [title]);

  const cls =
    "inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface disabled:opacity-50";

  if (!title.canDownload) {
    return (
      <button type="button" disabled className={cls} title="Offline viewing is not available for this title">
        <Download className="size-4" strokeWidth={1.5} />
        Not available offline
      </button>
    );
  }
  if (state === "saved") {
    return (
      <Link to="/downloads" className={cls}>
        <Download className="size-4" strokeWidth={1.5} />
        Saved for offline
      </Link>
    );
  }

  const start = async () => {
    setMsg(null);
    if (!account.userId) return setMsg("Sign in to watch offline.");
    setState("busy");
    try {
      const { url } = await getUrl({ data: { id: title.id } });
      const blob = await downloadToApp(url, setPct);
      await saveOffline({ id: title.id, name: title.name, blob });
      setState("saved");
    } catch (e) {
      setState("idle");
      setMsg(e instanceof Error ? e.message : "Download failed.");
    }
  };

  return (
    <div>
      <button type="button" onClick={() => void start()} disabled={state === "busy"} className={cls}>
        <Download className="size-4" strokeWidth={1.5} />
        {state === "busy" ? `Saving ${pct}%` : "Watch offline"}
      </button>
      {msg ? <p className="mt-1 text-xs text-destructive">{msg}</p> : null}
    </div>
  );
}

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
            {title.demo ? (
              <p className="text-xs uppercase tracking-[0.3em] text-primary">Demo content</p>
            ) : null}
            <h1 className="mt-3 text-3xl font-semibold text-foreground sm:text-5xl">{title.name}</h1>
            <p className="mt-3 text-xs text-muted-foreground">
              {[title.year, title.runtime, title.maturity, title.rating ? `Rated ${title.rating.toFixed(1)}` : ""]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{title.synopsis}</p>

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
              <DownloadButton title={title} />
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
                <span key={genre} className="rounded-sm border border-border px-2.5 py-1 text-xs text-muted-foreground">
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

        <Comments titleId={title.id} />

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
          Own this title and want it removed?{" "}
          <Link to="/removal-request" className="text-primary">
            Request removal
          </Link>
        </p>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-foreground">{value}</dd>
    </div>
  );
}
