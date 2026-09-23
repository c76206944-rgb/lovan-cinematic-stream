CREATE TABLE public.title_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT '',
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX title_comments_title_idx ON public.title_comments (title_id, created_at DESC);
GRANT SELECT ON public.title_comments TO anon;
GRANT SELECT, INSERT, DELETE ON public.title_comments TO authenticated;
GRANT ALL ON public.title_comments TO service_role;
ALTER TABLE public.title_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads comments" ON public.title_comments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users post own comments" ON public.title_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users or staff delete comments" ON public.title_comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

CREATE TABLE public.title_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title_name text NOT NULL CHECK (char_length(title_name) BETWEEN 1 AND 200),
  kind text NOT NULL CHECK (kind IN ('movie','series')),
  year text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 1000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','planned','added','declined')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.title_requests TO authenticated;
GRANT ALL ON public.title_requests TO service_role;
ALTER TABLE public.title_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users create own requests" ON public.title_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own requests, staff all" ON public.title_requests FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_staff(auth.uid()));
CREATE POLICY "Staff update requests" ON public.title_requests FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
GRANT UPDATE ON public.title_requests TO authenticated;

CREATE TABLE public.removal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 120),
  email text NOT NULL CHECK (char_length(email) BETWEEN 5 AND 255),
  organisation text NOT NULL DEFAULT '',
  relationship text NOT NULL CHECK (relationship IN ('owner','authorized_agent','distributor','other')),
  title_name text NOT NULL CHECK (char_length(title_name) BETWEEN 1 AND 200),
  title_url text NOT NULL DEFAULT '',
  proof text NOT NULL CHECK (char_length(proof) BETWEEN 20 AND 3000),
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 10 AND 3000),
  good_faith boolean NOT NULL CHECK (good_faith),
  accurate boolean NOT NULL CHECK (accurate),
  signature text NOT NULL CHECK (char_length(signature) BETWEEN 2 AND 120),
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','reviewing','removed','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.removal_requests TO anon, authenticated;
GRANT SELECT, UPDATE ON public.removal_requests TO authenticated;
GRANT ALL ON public.removal_requests TO service_role;
ALTER TABLE public.removal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can file a removal request" ON public.removal_requests FOR INSERT TO anon, authenticated WITH CHECK (status = 'received');
CREATE POLICY "Staff read removal requests" ON public.removal_requests FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff update removal requests" ON public.removal_requests FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));