-- Allow business portal promoter signups to claim promoter role.

CREATE OR REPLACE FUNCTION public.claim_promoter_role()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  meta_role TEXT;
  user_email TEXT;
  user_name TEXT;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT
    raw_user_meta_data->>'role',
    email,
    COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1))
  INTO meta_role, user_email, user_name
  FROM auth.users
  WHERE id = uid;

  IF meta_role IS DISTINCT FROM 'promoter' THEN
    IF NOT EXISTS (SELECT 1 FROM public.promoter_profiles p WHERE p.user_id = uid) THEN
      RAISE EXCEPTION 'Not eligible for promoter role';
    END IF;
  END IF;

  INSERT INTO public.users (id, email, name, role, created_at, updated_at)
  VALUES (uid, user_email, user_name, 'promoter', NOW(), NOW())
  ON CONFLICT (id) DO UPDATE
  SET role = 'promoter',
      email = EXCLUDED.email,
      name = COALESCE(NULLIF(EXCLUDED.name, ''), public.users.name),
      updated_at = NOW();

  INSERT INTO public.promoter_profiles (user_id, display_name, contact_email, updated_at)
  VALUES (uid, user_name, user_email, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), public.promoter_profiles.display_name),
      contact_email = COALESCE(EXCLUDED.contact_email, public.promoter_profiles.contact_email),
      updated_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_promoter_role() TO authenticated;
