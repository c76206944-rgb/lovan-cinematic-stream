CREATE TABLE public.site_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_announcements TO anon;
GRANT SELECT, INSERT, DELETE ON public.site_announcements TO authenticated;
GRANT ALL ON public.site_announcements TO service_role;
ALTER TABLE public.site_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads announcements" ON public.site_announcements FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Staff post announcements" ON public.site_announcements FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff delete announcements" ON public.site_announcements FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));