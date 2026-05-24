-- Allow business portal driver signups to claim driver role on their profile
-- when auth.users.raw_user_meta_data.role = 'driver'.

CREATE OR REPLACE FUNCTION public.claim_driver_role()
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

  IF meta_role IS DISTINCT FROM 'driver' THEN
    IF NOT EXISTS (SELECT 1 FROM public.driver_companies c WHERE c.owner_id = uid) THEN
      RAISE EXCEPTION 'Not eligible for driver role';
    END IF;
  END IF;

  INSERT INTO public.users (id, email, name, role, created_at, updated_at)
  VALUES (uid, user_email, user_name, 'driver', NOW(), NOW())
  ON CONFLICT (id) DO UPDATE
  SET role = 'driver',
      email = EXCLUDED.email,
      name = COALESCE(NULLIF(EXCLUDED.name, ''), public.users.name),
      updated_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_driver_role() TO authenticated;
