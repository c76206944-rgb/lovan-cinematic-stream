DROP POLICY IF EXISTS "Anyone reads comments" ON public.title_comments;
CREATE POLICY "Read comments on published titles"
ON public.title_comments FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.catalog_titles c
    WHERE c.id::text = title_comments.title_id
      AND c.published = true AND COALESCE(c.archived, false) = false
  )
  OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  OR (auth.uid() IS NOT NULL AND public.is_staff(auth.uid()))
);