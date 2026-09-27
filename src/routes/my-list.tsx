import { createFileRoute, Link } from "@tanstack/react-router";
import { useCatalog } from "@/lib/use-catalog";
import { useWatchlist } from "@/lib/viewer";
import { PageHeading, TitleGrid } from "@/components/site/TitleGrid";

export const Route = createFileRoute("/my-list")({
  head: () => ({
    meta: [
      { title: "My List | LOVAN" },
      { name: "description", content: "Titles you saved to watch later on LOVAN." },
      { property: "og:title", content: "My List | LOVAN" },
      { property: "og:description", content: "Titles you saved to watch later on LOVAN." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MyListPage,
});

function MyListPage() {
  const { titles } = useCatalog();
  const list = useWatchlist();
  const items = list.ids.map((id) => titles.find((t) => t.id === id)).filter((t): t is NonNullable<typeof t> => Boolean(t));
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6">
      <PageHeading title="My List" description="Everything you saved for later." />
      {!list.signedIn ? (
        <p className="text-sm text-muted-foreground">
          <Link to="/auth" className="text-primary">Sign in</Link> to save titles to your list.
        </p>
      ) : items.length === 0 && !list.loading ? (
        <p className="text-sm text-muted-foreground">Nothing saved yet. Tap Add to My List on any title.</p>
      ) : (
        <TitleGrid items={items} />
      )}
    </div>
  );
}
