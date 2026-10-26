import { useQuery } from "@tanstack/react-query";
import { getComingSoon } from "@/lib/coming-soon.functions";

function label(date: string) {
  const d = new Date(`${date}T00:00:00`);
  const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
  if (days <= 0) return "Out now";
  if (days === 1) return "Tomorrow";
  if (days <= 14) return `In ${days} days`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toUpperCase();
}

export function ComingSoon() {
  const { data } = useQuery({ queryKey: ["coming-soon"], queryFn: () => getComingSoon(), staleTime: 6 * 3600000 });
  if (!data?.length) return null;
  return (
    <section className="px-4 py-6 sm:px-6">
      <h2 className="text-lg font-semibold text-foreground">Coming soon</h2>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
        {data.map((item) => (
          <article key={item.id} className="w-32 shrink-0 sm:w-40" title={item.overview}>
            <div className="relative overflow-hidden rounded-md bg-muted">
              <img src={item.poster} alt={item.name} loading="lazy" width={342} height={513} className="aspect-[2/3] w-full object-cover" />
              <span className="absolute left-2 top-2 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                {label(item.date)}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-foreground">{item.name}</p>
            <p className="text-xs text-muted-foreground">{item.kind === "movie" ? "Film" : "Series"}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
