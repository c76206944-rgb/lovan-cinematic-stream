import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { recommendTitles } from "@/lib/recommend.functions";
import { getTitle } from "@/data/titles";
import { TitleCard } from "@/components/site/TitleCard";
import { PageHeading } from "@/components/site/TitleGrid";

export const Route = createFileRoute("/for-you")({
  head: () => ({
    meta: [
      { title: "For You | LOVAN" },
      {
        name: "description",
        content:
          "Describe the kind of film or series you want to watch and LOVAN suggests matching titles from the catalogue.",
      },
      { property: "og:title", content: "For You | LOVAN" },
      {
        property: "og:description",
        content: "Describe what you want to watch and get matching LOVAN titles.",
      },
    ],
  }),
  component: ForYouPage,
});

const examples = [
  "A slow quiet drama set at night in a big city",
  "Something hopeful about family, under two hours",
  "A cold thriller with subtitles",
];

type Pick = { id: string; reason: string };

function ForYouPage() {
  const recommend = useServerFn(recommendTitles);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intro, setIntro] = useState<string | null>(null);
  const [picks, setPicks] = useState<Pick[]>([]);

  const submit = async (value: string) => {
    const text = value.trim();
    if (text.length < 3 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await recommend({ data: { query: text } });
      setIntro(result.intro);
      setPicks(result.picks);
    } catch {
      setError("The suggestions could not be loaded. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-6">
      <PageHeading
        title="For You"
        description="Describe what you are in the mood for and we will suggest titles from the LOVAN catalogue."
      />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit(query);
        }}
        className="mt-6 max-w-2xl"
      >
        <label htmlFor="mood" className="text-sm text-muted-foreground">
          What do you want to watch
        </label>
        <textarea
          id="mood"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          rows={3}
          placeholder="A quiet drama about work and family, nothing violent"
          className="mt-2 w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={loading || query.trim().length < 3}
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Finding titles" : "Find titles"}
          </button>
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => {
                setQuery(example);
                void submit(example);
              }}
              className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {example}
            </button>
          ))}
        </div>
      </form>

      {error ? <p className="mt-6 text-sm text-primary">{error}</p> : null}

      {intro ? <p className="mt-10 max-w-2xl text-sm text-muted-foreground">{intro}</p> : null}

      {picks.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {picks.map((pick) => {
            const title = getTitle(pick.id);
            if (!title) return null;
            return (
              <div key={pick.id}>
                <TitleCard title={title} />
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{pick.reason}</p>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
