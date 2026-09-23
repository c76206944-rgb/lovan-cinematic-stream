import { createFileRoute, Link } from "@tanstack/react-router";
import { collapseSeries } from "@/data/titles";
import { TitleCard } from "@/components/site/TitleCard";
import { useCatalog } from "@/lib/use-catalog";
import still01 from "@/assets/still-01.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LOVAN | Films and series from everywhere" },
      { name: "description", content: "Watch films and series on LOVAN. Free to watch, supported by advertising." },
      { property: "og:title", content: "LOVAN | Films and series" },
      { property: "og:description", content: "Watch films and series on LOVAN, free." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const sections = [
  { title: "Discover", body: "Browse by genre, country and language, or search by name, cast or director." },
  { title: "Watch", body: "Play on your phone, tablet or computer and install LOVAN as an app." },
  { title: "Save for offline", body: "Keep approved titles on your device and watch them inside LOVAN without a connection." },
  { title: "Free to watch", body: "LOVAN is free. A small number of adverts keep it running." },
];

const faq = [
  { q: "Is LOVAN free?", a: "Yes. LOVAN is free to watch and may show a small number of adverts." },
  { q: "Which devices are supported?", a: "Any modern browser on Android, iPhone, tablets and computers." },
  { q: "Can I download titles?", a: "Yes, for titles marked for offline viewing. Saved copies play only inside LOVAN." },
  { q: "Can I ask for a title?", a: "Yes. Use Request a title at the bottom of any page." },
];

function Landing() {
  const { titles } = useCatalog();
  const shown = collapseSeries(titles);
  const featured = shown[0];

  return (
    <div>
      <section className="relative">
        <img src={featured?.image ?? still01} alt="" width={1536} height={864} className="h-[70vh] min-h-[420px] w-full object-cover opacity-55" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/10" />
        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto w-full max-w-[1600px] px-4 pb-12 sm:px-6">
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-foreground sm:text-6xl">
              Cinema, wherever your story takes you.
            </h1>
            <p className="mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">Films and series from around the world.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/home" className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
                Start watching
              </Link>
              <Link to="/search" className="rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface">
                Search
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

      {shown.length ? (
        <section className="mx-auto max-w-[1600px] px-4 sm:px-6">
          <h2 className="text-xl font-semibold text-foreground">Latest titles</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {shown.slice(0, 8).map((title) => (
              <TitleCard key={title.id} title={title} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-[1600px] px-4 py-20 sm:px-6">
        <h2 className="text-xl font-semibold text-foreground">Questions</h2>
        <dl className="mt-6 grid gap-6 sm:grid-cols-2">
          {faq.map((item) => (
            <div key={item.q} className="border-t border-border pt-4">
              <dt className="text-sm font-medium text-foreground">{item.q}</dt>
              <dd className="mt-2 text-sm text-muted-foreground">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
