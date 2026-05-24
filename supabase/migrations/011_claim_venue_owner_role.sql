-- Allow business portal signups to claim venueOwner on their own profile
-- when auth.users.raw_user_meta_data.role = 'venueOwner'.
-- Run after 010_event_series_tickets.sql

CREATE OR REPLACE FUNCTION public.claim_venue_owner_role()
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

  IF meta_role IS DISTINCT FROM 'venueOwner' THEN
    IF NOT EXISTS (SELECT 1 FROM public.venues v WHERE v.owner_id = uid) THEN
      RAISE EXCEPTION 'Not eligible for venue owner role';
    END IF;
  END IF;

  INSERT INTO public.users (id, email, name, role, created_at, updated_at)
  VALUES (uid, user_email, user_name, 'venueOwner', NOW(), NOW())
  ON CONFLICT (id) DO UPDATE
  SET role = 'venueOwner',
      email = EXCLUDED.email,
      name = COALESCE(NULLIF(EXCLUDED.name, ''), public.users.name),
      updated_at = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_venue_owner_role() TO authenticated;
