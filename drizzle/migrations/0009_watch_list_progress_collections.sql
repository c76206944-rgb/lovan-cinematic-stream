CREATE TABLE public.watch_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title_id uuid NOT NULL REFERENCES public.catalog_titles(id) ON DELETE CASCADE,
  position_seconds real NOT NULL DEFAULT 0,
  duration_seconds real NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, title_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watch_progress TO authenticated;
GRANT ALL ON public.watch_progress TO service_role;
ALTER TABLE public.watch_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own progress" ON public.watch_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.watchlist (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title_id uuid NOT NULL REFERENCES public.catalog_titles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, title_id)
);
GRANT SELECT, INSERT, DELETE ON public.watchlist TO authenticated;
GRANT ALL ON public.watchlist TO service_role;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own list read" ON public.watchlist FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own list add" ON public.watchlist FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own list remove" ON public.watchlist FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  placement text NOT NULL DEFAULT 'rail' CHECK (placement IN ('hero','rail')),
  position integer NOT NULL DEFAULT 0,
  title_ids uuid[] NOT NULL DEFAULT '{}',
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.collections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections TO authenticated;
GRANT ALL ON public.collections TO service_role;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published collections readable" ON public.collections FOR SELECT TO anon, authenticated USING (published = true);
CREATE POLICY "Staff read collections" ON public.collections FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff insert collections" ON public.collections FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff update collections" ON public.collections FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff delete collections" ON public.collections FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));