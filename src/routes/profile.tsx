import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageHeading } from "@/components/site/TitleGrid";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/use-account";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile | LOVAN" },
      { name: "description", content: "Your LOVAN account, playback preferences and plan." },
      { property: "og:title", content: "Profile | LOVAN" },
      { property: "og:description", content: "Your LOVAN account and playback preferences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const account = useAccount();
  const navigate = useNavigate();

  if (!account.ready) {
    return <div className="mx-auto max-w-3xl px-4 py-12 text-sm text-muted-foreground sm:px-6">Loading your account.</div>;
  }

  if (!account.email) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <PageHeading title="Profile" description="Sign in to see your account, your list and your plan." />
        <div className="flex flex-wrap gap-3">
          <Link to="/auth" className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
            Sign in
          </Link>
          <Link to="/auth" className="rounded-md border border-border px-5 py-2.5 text-sm text-foreground hover:border-primary">
            Create an account
          </Link>
        </div>
      </div>
    );
  }

  const rows = [
    { label: "Email", value: account.email },
    { label: "Account type", value: account.staff ? "Studio administrator" : "Viewer" },
    { label: "Plan", value: "Free with limited advertising" },
    { label: "Preferred audio", value: "Original language" },
    { label: "Preferred subtitles", value: "English" },
    { label: "Playback quality", value: "Automatic" },
  ];

  const signOut = async () => {
    await supabase.auth.signOut();
    void navigate({ to: "/" });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <PageHeading title="Profile" description="Your account details and viewing preferences." />
      <dl className="divide-y divide-border rounded-lg border border-border bg-surface">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4 px-5 py-4">
            <dt className="text-sm text-muted-foreground">{row.label}</dt>
            <dd className="text-sm text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6 flex flex-wrap gap-3">
        {account.staff ? (
          <Link to="/admin" className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
            Open the upload studio
          </Link>
        ) : (
          <Link to="/premium" className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
            Upgrade to Premium
          </Link>
        )}
        <button type="button" onClick={signOut} className="rounded-md border border-border px-5 py-2.5 text-sm text-foreground hover:border-primary">
          Sign out
        </button>
      </div>
    </div>
  );
}
