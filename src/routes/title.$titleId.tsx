import { useEffect, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Download, Play, Plus, Share2 } from "lucide-react";
import { collapseSeries, type Title } from "@/data/titles";
import { TitleCard } from "@/components/site/TitleCard";
import { Comments } from "@/components/site/Comments";
import { AdSlot } from "@/components/site/AdSlot";
import { Player } from "@/components/site/Player";
import { getOfflineVideoUrl } from "@/lib/offline.functions";
import { getPlaybackUrl } from "@/lib/public-catalog.functions";
import { downloadToApp, getOffline, saveOffline } from "@/lib/offline-store";
import { useAccount } from "@/lib/use-account";
import { catalogQuery, useCatalog } from "@/lib/use-catalog";

type ViewTitle = Title;

export const Route = createFileRoute("/title/$titleId")({
  loader: async ({ params, context }): Promise<{ title: ViewTitle }> => {
    const all = await context.queryClient.ensureQueryData(catalogQuery);
    const title = all.find((t) => t.id === params.titleId);
    if (!title) throw notFound();
    return { title };
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
  const { titles } = useCatalog();
  const play = useServerFn(getPlaybackUrl);
  const loadTracks = useServerFn(getSubtitleTracks);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [tracks, setTracks] = useState<{ lang: string; label: string; url: string }[]>([]);
  const [playMsg, setPlayMsg] = useState<string | null>(null);
  useEffect(() => { setVideoUrl(null); setPlayMsg(null); setTracks([]); }, [title.id]);
  const episodes = title.kind === "series"
    ? titles.filter((t) => t.kind === "series" && t.seriesName.toLowerCase() === title.seriesName.toLowerCase())
        .sort((a, b) => (a.season ?? 0) - (b.season ?? 0) || (a.episode ?? 0) - (b.episode ?? 0))
    : [];
  const related = collapseSeries(titles)
    .filter((t) => t.id !== title.id && t.seriesName !== title.seriesName && t.genres.some((g) => title.genres.includes(g)))
    .slice(0, 8);
  const startPlay = async () => {
    setPlayMsg(null);
    try {
      const { url } = await play({ data: { id: title.id } });
      setVideoUrl(url);
      window.scrollTo({ top: 0, behavior: "smooth" });
      void loadTracks({ data: { id: title.id } }).then(setTracks).catch(() => setTracks([]));
    } catch (e) {
      setPlayMsg(e instanceof Error ? e.message : "Could not start playback.");
    }
  };

  return (
    <div className="pb-16">
      {videoUrl ? (
        <section className="bg-background">
          <Player src={videoUrl} tracks={tracks} onExit={() => setVideoUrl(null)} />
        </section>
      ) : (
      <section className="relative">
        <img
          src={title.image}
          alt=""
          width={1536}
          height={864}
          className="h-[58vh] min-h-[340px] w-full object-cover object-center opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <Link
          to="/home"
          className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-md border border-border bg-background/80 px-3 py-1.5 text-xs text-foreground"
        >
          <ArrowLeft className="size-4" strokeWidth={1.5} />
          Back
        </Link>
      </section>
      )}


      <div className={`mx-auto ${videoUrl ? "mt-8" : "-mt-28"} max-w-[1600px] px-4 sm:px-6`}>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div>
            <h1 className="mt-3 break-words text-3xl font-semibold text-foreground sm:text-5xl">{title.name}</h1>
            {title.kind === "series" ? (
              <p className="mt-2 text-sm text-foreground">Season {title.season ?? 1}, Episode {title.episode ?? 1}{title.episodeTitle && title.episodeTitle !== title.name ? `: ${title.episodeTitle}` : ""}</p>
            ) : null}
            <p className="mt-3 text-xs text-muted-foreground">
              {[title.year, title.runtime, title.maturity]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{title.synopsis}</p>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void startPlay()}
                disabled={!title.hasVideo}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
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

            {playMsg ? <p className="mt-2 text-xs text-destructive">{playMsg}</p> : null}
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
          </dl>
        </div>

        {episodes.length > 1 ? (
          <section className="mt-12">
            <h2 className="text-lg font-semibold text-foreground">Episodes</h2>
            <ol className="mt-4 divide-y divide-border rounded-lg border border-border">
              {episodes.map((ep) => (
                <li key={ep.id}>
                  <Link
                    to="/title/$titleId"
                    params={{ titleId: ep.id }}
                    className={`flex items-center justify-between gap-3 px-4 py-3 text-sm ${ep.id === title.id ? "text-primary" : "text-foreground hover:bg-surface"}`}
                  >
                    <span className="min-w-0 truncate">S{ep.season ?? 1} E{ep.episode ?? 1}{ep.episodeTitle && ep.episodeTitle !== ep.name ? ` · ${ep.episodeTitle}` : ""}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{ep.runtime}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <AdSlot placement="banner" />

        <Comments titleId={title.id} />

        {related.length > 0 ? (
          <section className="mt-14">
            <h2 className="text-lg font-semibold text-foreground">More like this</h2>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((item: Title) => (
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
