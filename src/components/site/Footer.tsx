import { Link } from "@tanstack/react-router";

const links = [
  { to: "/movies", label: "Movies" },
  { to: "/series", label: "Series" },
  { to: "/requests", label: "Request a title" },
  { to: "/downloads", label: "Downloads" },
  { to: "/removal-request", label: "Request removal" },
  { to: "/help", label: "Help" },
  { to: "/contact", label: "Contact" },
  { to: "/terms", label: "Terms" },
  { to: "/privacy", label: "Privacy" },
  { to: "/cookie-policy", label: "Cookie Policy" },
  { to: "/ad-choices", label: "Ad choices" },
] as const;

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-[1600px] px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <span className="font-display text-sm font-semibold tracking-[0.22em] text-primary">
            LOVAN
          </span>
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <p className="mt-6 max-w-3xl text-xs leading-relaxed text-muted-foreground">
          Disclaimer: LOVAN does not own the films and series shown here. They come from different sources, and all rights belong to their respective owners. If you own a title and want it removed, use Request removal.
        </p>
      </div>
    </footer>
  );
}
