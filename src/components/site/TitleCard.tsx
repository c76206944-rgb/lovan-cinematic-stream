import { Link } from "@tanstack/react-router";
import type { Title } from "@/data/titles";

type Props = {
  title: Title;
  progress?: number | undefined;
  className?: string | undefined;
};

export function TitleCard({ title, progress, className }: Props) {
  return (
    <Link
      to="/title/$titleId"
      params={{ titleId: title.id }}
      className={`group block ${className ?? ""}`}
    >
      <div className="relative overflow-hidden rounded-md border border-border bg-surface">
        <img
          src={title.image}
          alt={title.name}
          loading="lazy"
          width={1536}
          height={864}
          className="aspect-video w-full object-cover opacity-90 transition-opacity duration-300 group-hover:opacity-100"
        />
        {title.premium ? (
          <span className="absolute left-2 top-2 rounded-sm bg-background/80 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-primary">
            Premium
          </span>
        ) : null}
        {typeof progress === "number" ? (
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-border">
            <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
          </div>
        ) : null}
      </div>
      <p className="mt-2 truncate text-sm text-foreground">{title.name}</p>
      <p className="truncate text-xs text-muted-foreground">
        {title.year} · {title.country} · {title.language}
      </p>
    </Link>
  );
}
