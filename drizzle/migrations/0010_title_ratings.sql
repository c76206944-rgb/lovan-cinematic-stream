CREATE TABLE public.title_ratings (
  title_id uuid NOT NULL REFERENCES public.catalog_titles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  score smallint NOT NULL CHECK (score BETWEEN 1 AND 5),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (title_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.title_ratings TO authenticated;
GRANT ALL ON public.title_ratings TO service_role;
ALTER TABLE public.title_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own rating" ON public.title_ratings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Add own rating" ON public.title_ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Change own rating" ON public.title_ratings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Remove own rating" ON public.title_ratings FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.rating_stats()
RETURNS TABLE(title_id uuid, average numeric, votes bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT r.title_id, round(avg(r.score)::numeric, 1), count(*)
  FROM public.title_ratings r
  JOIN public.catalog_titles c ON c.id = r.title_id AND c.published AND NOT c.archived
  GROUP BY r.title_id;
$$;
GRANT EXECUTE ON FUNCTION public.rating_stats() TO anon, authenticated;