CREATE POLICY "Staff read media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'media' AND public.is_staff(auth.uid()));

CREATE POLICY "Staff upload media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'media' AND public.is_staff(auth.uid()));

CREATE POLICY "Staff update media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'media' AND public.is_staff(auth.uid()));

CREATE POLICY "Staff delete media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'media' AND public.is_staff(auth.uid()));
