-- Roles
CREATE TYPE public.app_role AS ENUM ('super_admin', 'content_admin', 'ad_manager', 'support_admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id);
$$;

CREATE POLICY "Users read own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- The private owner account claims its role once, after signing in.
CREATE OR REPLACE FUNCTION public.claim_owner_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email text;
BEGIN
  SELECT lower(email) INTO _email FROM auth.users WHERE id = auth.uid();
  IF _email IS NULL OR _email <> 'nyrorys@gmail.com' THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'super_admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_owner_admin() TO authenticated;

-- Catalogue
CREATE TABLE public.catalog_titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'movie',
  year integer NOT NULL DEFAULT date_part('year', now())::int,
  country text NOT NULL DEFAULT '',
  language text NOT NULL DEFAULT '',
  runtime text NOT NULL DEFAULT '',
  maturity text NOT NULL DEFAULT 'PG',
  premium boolean NOT NULL DEFAULT false,
  synopsis text NOT NULL DEFAULT '',
  genres text[] NOT NULL DEFAULT '{}',
  cast_members text[] NOT NULL DEFAULT '{}',
  director text NOT NULL DEFAULT '',
  video_path text,
  poster_url text,
  ad_enabled boolean NOT NULL DEFAULT true,
  ad_notes text NOT NULL DEFAULT '',
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.catalog_titles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_titles TO authenticated;
GRANT ALL ON public.catalog_titles TO service_role;
ALTER TABLE public.catalog_titles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published titles are readable"
ON public.catalog_titles FOR SELECT TO anon, authenticated
USING (published = true);

CREATE POLICY "Staff read all titles"
ON public.catalog_titles FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff insert titles"
ON public.catalog_titles FOR INSERT TO authenticated
WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff update titles"
ON public.catalog_titles FOR UPDATE TO authenticated
USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff delete titles"
ON public.catalog_titles FOR DELETE TO authenticated
USING (public.is_staff(auth.uid()));
