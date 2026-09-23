ALTER TABLE public.catalog_titles ADD COLUMN IF NOT EXISTS offline_allowed boolean NOT NULL DEFAULT false;
ALTER TABLE public.catalog_titles ADD COLUMN IF NOT EXISTS upload_key uuid;
CREATE UNIQUE INDEX IF NOT EXISTS catalog_titles_upload_key_idx ON public.catalog_titles(upload_key) WHERE upload_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS catalog_titles_episode_unique_idx ON public.catalog_titles(lower(series_name), season, episode) WHERE kind = 'series';