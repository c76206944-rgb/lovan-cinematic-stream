import { queryOptions, useQuery } from "@tanstack/react-query";
import { getCatalog } from "@/lib/public-catalog.functions";
import { fallbackImage, type Title } from "@/data/titles";
import { isKidsTitle, useKidsMode } from "@/lib/kids-mode";

export const catalogQuery = queryOptions({
  queryKey: ["public-catalog"],
  queryFn: async () => (await getCatalog()).map((t) => ({ ...t, image: t.image || fallbackImage(t.id) })),
  staleTime: 60_000,
});

/** Published titles. In kids mode only family and animation titles are returned. */
export function useCatalog(): { titles: Title[]; loading: boolean } {
  const q = useQuery(catalogQuery);
  const kids = useKidsMode();
  const all = q.data ?? [];
  return { titles: kids ? all.filter(isKidsTitle) : all, loading: q.isLoading };
}
