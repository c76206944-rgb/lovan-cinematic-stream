CREATE OR REPLACE FUNCTION public.claim_owner_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _email text;
BEGIN
  SELECT lower(email) INTO _email FROM auth.users
  WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL;
  IF _email IS NULL OR _email <> 'nyrorys@gmail.com' THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'super_admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN true;
END;
$function$;