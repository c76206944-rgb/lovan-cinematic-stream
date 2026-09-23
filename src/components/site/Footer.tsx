import { Link } from "@tanstack/react-router";

const links = [
  { to: "/movies", label: "Movies" },
  { to: "/series", label: "Series" },
  { to: "/donate", label: "Donate" },
  { to: "/requests", label: "Request a title" },
  { to: "/downloads", label: "Downloads" },
  { to: "/removal-request", label: "Request removal" },
  { to: "/help", label: "Help" },
  { to: "/contact", label: "Contact" },
  { to: "/terms", label: "Terms" },
  { to: "/privacy", label: "Privacy" },
  { to: "/cookie-policy", label: "Cookie Policy" },
] as const;

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border pb-24 lg:pb-0">
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
      </div>
    </footer>
  );
}
