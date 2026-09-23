import { Link } from "@tanstack/react-router";
import { Compass, Home, List, Search, User } from "lucide-react";

const desktopLinks = [
  { to: "/home", label: "Home" },
  { to: "/explore", label: "Explore" },
  { to: "/movies", label: "Movies" },
  { to: "/series", label: "Series" },
  { to: "/genres", label: "Genres" },
  { to: "/new-releases", label: "New Releases" },
  { to: "/trending", label: "Trending" },
  { to: "/for-you", label: "For You" },
  { to: "/my-list", label: "My List" },
] as const;

const mobileLinks = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/search", label: "Search", icon: Search },
  { to: "/my-list", label: "My List", icon: List },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/92 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-6 px-4 sm:px-6">
        <Link to="/" className="font-display text-lg font-semibold tracking-[0.22em] text-primary">
          LOVAN
        </Link>

        <nav className="hidden flex-1 items-center gap-5 lg:flex">
          {desktopLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-sm text-foreground" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Link
            to="/search"
            aria-label="Search"
            className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Search className="size-4" strokeWidth={1.5} />
          </Link>
          <Link
            to="/premium"
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Premium
          </Link>
          <Link
            to="/profile"
            aria-label="Profile"
            className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <User className="size-4" strokeWidth={1.5} />
          </Link>
        </div>
      </div>
    </header>
  );
}

export function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background lg:hidden">
      <ul className="mx-auto flex max-w-lg items-center justify-between px-2 py-2">
        {mobileLinks.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="flex w-16 flex-col items-center gap-1 py-1 text-[11px] text-muted-foreground"
              activeProps={{ className: "text-primary" }}
            >
              <link.icon className="size-5" strokeWidth={1.5} />
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
