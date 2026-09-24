ALTER TABLE public.catalog_titles
  ADD COLUMN IF NOT EXISTS subtitles jsonb NOT NULL DEFAULT '[]'::jsonb;