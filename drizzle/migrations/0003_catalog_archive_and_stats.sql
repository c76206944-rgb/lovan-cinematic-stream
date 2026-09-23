ALTER TABLE public.catalog_titles
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS video_bytes bigint,
  ADD COLUMN IF NOT EXISTS poster_width integer,
  ADD COLUMN IF NOT EXISTS poster_height integer;

CREATE OR REPLACE FUNCTION public.admin_storage_stats()
RETURNS TABLE(folder text, files bigint, bytes bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, storage
AS $$
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
  SELECT split_part(o.name, '/', 1)::text AS folder,
         count(*)::bigint,
         coalesce(sum((o.metadata->>'size')::bigint), 0)::bigint
  FROM storage.objects o
  WHERE o.bucket_id = 'media'
  GROUP BY 1;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_storage_stats() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_storage_stats() TO authenticated;