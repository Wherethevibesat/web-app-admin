-- Remove points economy, rewards, and leaderboards.
-- Keep basic check-in (presence) with geofence + QR enforcement.
-- Run after 038_push_notifications.sql

-- ========== DROP REWARD / LEADERBOARD RPCs ==========
DROP FUNCTION IF EXISTS public.redeem_reward(UUID);
DROP FUNCTION IF EXISTS public.validate_reward_redemption(TEXT);
DROP FUNCTION IF EXISTS public.leaderboard_window(TIMESTAMPTZ, TIMESTAMPTZ, INTEGER);
DROP FUNCTION IF EXISTS public.recompute_user_points(UUID);

-- ========== DROP TABLES ==========
DROP TABLE IF EXISTS public.reward_redemptions CASCADE;
DROP TABLE IF EXISTS public.rewards CASCADE;
DROP TABLE IF EXISTS public.points_events CASCADE;
DROP TABLE IF EXISTS public.user_rankings CASCADE;

-- ========== CHECK-INS: stop awarding points ==========
ALTER TABLE public.check_ins
  ALTER COLUMN points_awarded SET DEFAULT 0;

UPDATE public.check_ins
SET points_awarded = 0
WHERE points_awarded IS DISTINCT FROM 0;

-- ========== BASIC CHECK-IN RPC (no points) ==========
DROP FUNCTION IF EXISTS public.check_in_venue(TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TEXT);

CREATE OR REPLACE FUNCTION public.check_in_venue(
  p_venue_id TEXT,
  p_caption TEXT DEFAULT NULL,
  p_lat DOUBLE PRECISION DEFAULT NULL,
  p_lng DOUBLE PRECISION DEFAULT NULL,
  p_accuracy DOUBLE PRECISION DEFAULT NULL,
  p_token TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cooldown_min CONSTANT INTEGER := 360;  -- one check-in per venue per 6h
  v_geofence_m   CONSTANT INTEGER := 150;
  v_accuracy_cap CONSTANT INTEGER := 75;

  uid           UUID := auth.uid();
  v_venue       RECORD;
  v_distance    DOUBLE PRECISION;
  v_allowed     DOUBLE PRECISION;
  v_geo_checked BOOLEAN := FALSE;
  v_qr_checked  BOOLEAN := FALSE;
  v_is_first    BOOLEAN;
  v_check_in_id UUID;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501';
  END IF;

  SELECT id, latitude, longitude, published, check_in_token, require_check_in_qr
  INTO v_venue
  FROM public.venues
  WHERE id = p_venue_id;

  IF NOT FOUND OR v_venue.published IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Venue not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.check_ins
    WHERE user_id = uid
      AND venue_id = p_venue_id
      AND started_at > NOW() - (v_cooldown_min || ' minutes')::interval
  ) THEN
    RAISE EXCEPTION 'You already checked in here recently. Come back later.'
      USING ERRCODE = '23505';
  END IF;

  IF v_venue.require_check_in_qr THEN
    IF p_token IS NULL OR v_venue.check_in_token IS NULL
       OR p_token <> v_venue.check_in_token THEN
      RAISE EXCEPTION 'Scan the venue''s QR code to check in here.' USING ERRCODE = '42501';
    END IF;
    v_qr_checked := TRUE;
  END IF;

  IF v_geofence_m > 0 AND v_venue.latitude IS NOT NULL AND v_venue.longitude IS NOT NULL THEN
    IF p_lat IS NULL OR p_lng IS NULL THEN
      RAISE EXCEPTION 'Turn on location access to check in at this venue.'
        USING ERRCODE = '42501';
    END IF;

    v_distance := public.haversine_meters(p_lat, p_lng, v_venue.latitude, v_venue.longitude);
    v_allowed := v_geofence_m + LEAST(COALESCE(p_accuracy, 0), v_accuracy_cap);

    IF v_distance > v_allowed THEN
      RAISE EXCEPTION 'You look about % m from the venue. Get closer to check in.',
        round(v_distance)::int USING ERRCODE = '42501';
    END IF;
    v_geo_checked := TRUE;
  END IF;

  v_is_first := NOT EXISTS (
    SELECT 1 FROM public.check_ins WHERE user_id = uid AND venue_id = p_venue_id
  );

  INSERT INTO public.check_ins (user_id, venue_id, caption, points_awarded)
  VALUES (uid, p_venue_id, p_caption, 0)
  RETURNING id INTO v_check_in_id;

  UPDATE public.venues
  SET check_in_count = COALESCE(check_in_count, 0) + 1
  WHERE id = p_venue_id;

  RETURN jsonb_build_object(
    'check_in_id', v_check_in_id,
    'first_visit', v_is_first,
    'location_verified', v_geo_checked,
    'qr_verified', v_qr_checked
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_in_venue(TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TEXT) TO authenticated;
