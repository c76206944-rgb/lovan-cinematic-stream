import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Rail as RailType } from "@/data/titles";
import { TitleCard } from "./TitleCard";

export function Rail({ rail }: { rail: RailType }) {
  const ref = useRef<HTMLDivElement>(null);

  const scrollBy = (direction: 1 | -1) => {
    const node = ref.current;
    if (!node) return;
    node.scrollBy({ left: direction * node.clientWidth * 0.8, behavior: "smooth" });
  };

  if (rail.items.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="mb-3 flex items-center justify-between gap-4 px-4 sm:px-6">
        <h2 className="text-base font-semibold text-foreground sm:text-lg">{rail.heading}</h2>
        <div className="hidden gap-1 sm:flex">
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollBy(-1)}
            className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-4" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollBy(1)}
            className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronRight className="size-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
      <div
        ref={ref}
        className="rail-scroll flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:px-6"
      >
        {rail.items.map((item) => (
          <TitleCard
            key={`${rail.id}-${item.id}`}
            title={item}
            className="w-[240px] shrink-0 snap-start sm:w-[280px]"
          />
        ))}
      </div>
    </section>
  );
}
