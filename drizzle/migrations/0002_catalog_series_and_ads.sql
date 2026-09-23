ALTER TABLE public.catalog_titles
  ADD COLUMN IF NOT EXISTS series_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS season integer,
  ADD COLUMN IF NOT EXISTS episode integer,
  ADD COLUMN IF NOT EXISTS episode_title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ad_placements text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ad_cues text NOT NULL DEFAULT '';