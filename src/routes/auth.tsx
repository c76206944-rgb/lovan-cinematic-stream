import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in | LOVAN" },
      { name: "description", content: "Sign in to your LOVAN account." },
      { property: "og:title", content: "Sign in | LOVAN" },
      { property: "og:description", content: "Sign in to your LOVAN account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin },
          });
    if (result.error) {
      setError(result.error.message);
      setBusy(false);
      return;
    }
    await supabase.rpc("claim_owner_admin");
    setBusy(false);
    void navigate({ to: "/admin" });
  };

  return (
    <div className="mx-auto max-w-md px-4 py-20 sm:px-6">
      <h1 className="text-2xl font-semibold text-foreground">
        {mode === "in" ? "Sign in" : "Create account"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Use your account email and password.
      </p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="email" className="text-sm text-muted-foreground">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>
        <div>
          <label htmlFor="password" className="text-sm text-muted-foreground">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>
        {error ? <p className="text-sm text-primary">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Please wait" : mode === "in" ? "Sign in" : "Create account"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => setMode(mode === "in" ? "up" : "in")}
        className="mt-6 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {mode === "in" ? "Create an account instead" : "I already have an account"}
      </button>
    </div>
  );
}
