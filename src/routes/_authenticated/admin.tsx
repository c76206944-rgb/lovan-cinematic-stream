import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin | LOVAN" },
      { name: "description", content: "LOVAN admin studio." },
      { property: "og:title", content: "Admin | LOVAN" },
      { property: "og:description", content: "LOVAN admin studio." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-semibold text-foreground">Admin</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The upload studio will appear here.
      </p>
    </div>
  );
}
