import { createFileRoute, redirect } from "@tanstack/react-router";

// Some previews and shared links open /index. Send them to the home page.
export const Route = createFileRoute("/index_")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
