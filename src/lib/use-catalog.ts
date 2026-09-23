import { queryOptions, useQuery } from "@tanstack/react-query";
import { getCatalog } from "@/lib/public-catalog.functions";
import { fallbackImage, type Title } from "@/data/titles";

export const catalogQuery = queryOptions({
  queryKey: ["public-catalog"],
  queryFn: async () => (await getCatalog()).map((t) => ({ ...t, image: t.image || fallbackImage(t.id) })),
  staleTime: 60_000,
});

export function useCatalog(): { titles: Title[]; loading: boolean } {
  const q = useQuery(catalogQuery);
  return { titles: q.data ?? [], loading: q.isLoading };
}
