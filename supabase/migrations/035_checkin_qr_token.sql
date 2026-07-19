-- QR-code check-in (tamper-resistant presence proof)
-- Run after 034_enable_checkin_geofence.sql
--
-- Each venue gets a secret check_in_token. When require_check_in_qr is on, a
-- check-in must include that token (delivered by scanning the venue's QR code),
-- on top of the geofence. Combined, a user must be physically near the venue AND
-- present the venue's code, which defeats remote point farming.

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS check_in_token TEXT,
  ADD COLUMN IF NOT EXISTS require_check_in_qr BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill a token for every existing venue, and default one for new rows.
UPDATE public.venues
SET check_in_token = replace(gen_random_uuid()::text, '-', '')
WHERE check_in_token IS NULL;

ALTER TABLE public.venues
  ALTER COLUMN check_in_token SET DEFAULT replace(gen_random_uuid()::text, '-', '');

DROP FUNCTION IF EXISTS public.check_in_venue(TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION);

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
  v_base_points     CONSTANT INTEGER := 25;
  v_first_bonus     CONSTANT INTEGER := 50;
  v_streak_bonus    CONSTANT INTEGER := 10;
  v_cooldown_min    CONSTANT INTEGER := 360;   -- one check-in per venue per 6h
  v_geofence_m      CONSTANT INTEGER := 150;   -- allowed radius in meters (0 disables)
  v_accuracy_cap    CONSTANT INTEGER := 75;    -- max GPS-error slack we trust

  uid            UUID := auth.uid();
  v_venue        RECORD;
  v_distance     DOUBLE PRECISION;
  v_allowed      DOUBLE PRECISION;
  v_geo_checked  BOOLEAN := FALSE;
  v_qr_checked   BOOLEAN := FALSE;
  v_is_first     BOOLEAN;
  v_streak       BOOLEAN := FALSE;
  v_check_in_id  UUID;
  v_award        INTEGER;
  v_total        INTEGER;
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

  -- Cooldown: block repeat check-ins at the same venue within the window.
  IF EXISTS (
    SELECT 1 FROM public.check_ins
    WHERE user_id = uid
      AND venue_id = p_venue_id
      AND started_at > NOW() - (v_cooldown_min || ' minutes')::interval
  ) THEN
    RAISE EXCEPTION 'You already checked in here recently. Come back later to earn more points.'
      USING ERRCODE = '23505';
  END IF;

  -- QR requirement: token must match when the venue requires it.
  IF v_venue.require_check_in_qr THEN
    IF p_token IS NULL OR v_venue.check_in_token IS NULL
       OR p_token <> v_venue.check_in_token THEN
      RAISE EXCEPTION 'Scan the venue''s QR code to check in here.' USING ERRCODE = '42501';
    END IF;
    v_qr_checked := TRUE;
  END IF;

  -- Geofence: enforce when enabled and the venue has coordinates to compare to.
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

  -- First visit to THIS venue?
  v_is_first := NOT EXISTS (
    SELECT 1 FROM public.check_ins WHERE user_id = uid AND venue_id = p_venue_id
  );

  -- Daily streak: checked in yesterday (any venue) and no streak bonus yet today.
  IF EXISTS (
    SELECT 1 FROM public.check_ins
    WHERE user_id = uid AND started_at::date = (CURRENT_DATE - 1)
  ) AND NOT EXISTS (
    SELECT 1 FROM public.points_events
    WHERE user_id = uid AND source = 'streak' AND created_at::date = CURRENT_DATE
  ) THEN
    v_streak := TRUE;
  END IF;

  INSERT INTO public.check_ins (user_id, venue_id, caption, points_awarded)
  VALUES (uid, p_venue_id, p_caption, v_base_points)
  RETURNING id INTO v_check_in_id;

  INSERT INTO public.points_events (user_id, source, points, venue_id, ref_id)
  VALUES (uid, 'check_in', v_base_points, p_venue_id, v_check_in_id);

  v_award := v_base_points;

  IF v_is_first THEN
    INSERT INTO public.points_events (user_id, source, points, venue_id, ref_id)
    VALUES (uid, 'first_visit', v_first_bonus, p_venue_id, v_check_in_id);
    v_award := v_award + v_first_bonus;
  END IF;

  IF v_streak THEN
    INSERT INTO public.points_events (user_id, source, points, venue_id, ref_id)
    VALUES (uid, 'streak', v_streak_bonus, p_venue_id, v_check_in_id);
    v_award := v_award + v_streak_bonus;
  END IF;

  INSERT INTO public.user_rankings (user_id, total_points, updated_at)
  VALUES (uid, v_award, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET total_points = public.user_rankings.total_points + EXCLUDED.total_points,
      updated_at = NOW()
  RETURNING total_points INTO v_total;

  UPDATE public.venues
  SET check_in_count = COALESCE(check_in_count, 0) + 1
  WHERE id = p_venue_id;

  RETURN jsonb_build_object(
    'check_in_id', v_check_in_id,
    'base_points', v_base_points,
    'first_visit', v_is_first,
    'first_visit_bonus', CASE WHEN v_is_first THEN v_first_bonus ELSE 0 END,
    'streak', v_streak,
    'streak_bonus', CASE WHEN v_streak THEN v_streak_bonus ELSE 0 END,
    'points_awarded', v_award,
    'total_points', v_total,
    'location_verified', v_geo_checked,
    'qr_verified', v_qr_checked
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_in_venue(TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TEXT) TO authenticated;
