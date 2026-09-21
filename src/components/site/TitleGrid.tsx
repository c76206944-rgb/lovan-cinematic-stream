import type { Title } from "@/data/titles";
import { TitleCard } from "./TitleCard";

export function TitleGrid({ items }: { items: Title[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No titles match this selection.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <TitleCard key={item.id} title={item} />
      ))}
    </div>
  );
}

export function PageHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="mb-8">
      <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
    </header>
  );
}
