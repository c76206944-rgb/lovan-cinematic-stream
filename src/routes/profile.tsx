import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeading } from "@/components/site/TitleGrid";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile | LOVAN" },
      { name: "description", content: "Your LOVAN account, playback preferences and plan." },
      { property: "og:title", content: "Profile | LOVAN" },
      { property: "og:description", content: "Your LOVAN account and playback preferences." },
    ],
  }),
  component: ProfilePage,
});

const rows = [
  { label: "Profile name", value: "Guest viewer" },
  { label: "Plan", value: "Free with limited advertising" },
  { label: "Preferred audio", value: "Original language" },
  { label: "Preferred subtitles", value: "English" },
  { label: "Playback quality", value: "Automatic" },
  { label: "Maturity level", value: "All titles" },
];

function ProfilePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <PageHeading
        title="Profile"
        description="Account details and viewing preferences. This demo profile is not connected to an account yet."
      />
      <dl className="divide-y divide-border rounded-lg border border-border bg-surface">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 px-5 py-4">
            <dt className="text-sm text-muted-foreground">{row.label}</dt>
            <dd className="text-sm text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>
      <Link
        to="/premium"
        className="mt-6 inline-block rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Upgrade to Premium
      </Link>
    </div>
  );
}
