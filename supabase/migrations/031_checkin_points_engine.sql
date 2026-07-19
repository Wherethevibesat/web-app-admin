-- Check-in & points engine
-- Run after 030_fix_users_rls_recursion.sql
--
-- Adds a points ledger and a single atomic, cheat-resistant check-in RPC that:
--   * enforces a per-venue cooldown (anti-farming)
--   * optionally enforces a geofence radius when coordinates are provided
--   * awards base points + first-visit bonus + daily-streak bonus
--   * records every award in points_events (the ledger)
--   * atomically increments user_rankings.total_points and venues.check_in_count
--
-- total_points remains a maintained cache; points_events is the source of truth.

-- ========== POINTS LEDGER ==========
CREATE TABLE IF NOT EXISTS public.points_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL,           -- check_in | first_visit | streak | event_attend | referral | review | redeem | adjustment
  points INTEGER NOT NULL,        -- may be negative (e.g. redeem/adjustment)
  venue_id TEXT REFERENCES public.venues(id) ON DELETE SET NULL,
  ref_id UUID,                    -- e.g. check_ins.id
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS points_events_user_created_idx
  ON public.points_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS points_events_source_idx
  ON public.points_events (source);

ALTER TABLE public.points_events ENABLE ROW LEVEL SECURITY;

-- Users can read their own ledger. Inserts only happen through SECURITY DEFINER
-- functions below, so there is intentionally no INSERT policy for clients.
DROP POLICY IF EXISTS points_events_select_own ON public.points_events;
CREATE POLICY points_events_select_own
  ON public.points_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ========== HELPERS ==========
-- Great-circle distance in meters between two lat/lng points.
CREATE OR REPLACE FUNCTION public.haversine_meters(
  lat1 DOUBLE PRECISION, lng1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION, lng2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) *
    power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

-- Recompute the cached total from the ledger (repair / backfill utility).
CREATE OR REPLACE FUNCTION public.recompute_user_points(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
BEGIN
  SELECT COALESCE(SUM(points), 0) INTO v_total
  FROM public.points_events WHERE user_id = p_user_id;

  INSERT INTO public.user_rankings (user_id, total_points, updated_at)
  VALUES (p_user_id, GREATEST(v_total, 0), NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET total_points = GREATEST(EXCLUDED.total_points, 0), updated_at = NOW();

  RETURN GREATEST(v_total, 0);
END;
$$;

-- ========== CHECK-IN RPC ==========
CREATE OR REPLACE FUNCTION public.check_in_venue(
  p_venue_id TEXT,
  p_caption TEXT DEFAULT NULL,
  p_lat DOUBLE PRECISION DEFAULT NULL,
  p_lng DOUBLE PRECISION DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Tunable rules (kept as constants here; can be moved to platform_settings later).
  v_base_points     CONSTANT INTEGER := 25;
  v_first_bonus     CONSTANT INTEGER := 50;
  v_streak_bonus    CONSTANT INTEGER := 10;
  v_cooldown_min    CONSTANT INTEGER := 360;   -- one check-in per venue per 6h
  v_geofence_m      CONSTANT INTEGER := 0;     -- 0 disables the geofence check

  uid            UUID := auth.uid();
  v_venue        RECORD;
  v_distance     DOUBLE PRECISION;
  v_is_first     BOOLEAN;
  v_streak       BOOLEAN := FALSE;
  v_check_in_id  UUID;
  v_award        INTEGER;
  v_total        INTEGER;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501';
  END IF;

  SELECT id, latitude, longitude, published
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

  -- Geofence: only enforced when enabled AND we have both venue and device coords.
  IF v_geofence_m > 0
     AND v_venue.latitude IS NOT NULL AND v_venue.longitude IS NOT NULL
     AND p_lat IS NOT NULL AND p_lng IS NOT NULL THEN
    v_distance := public.haversine_meters(p_lat, p_lng, v_venue.latitude, v_venue.longitude);
    IF v_distance > v_geofence_m THEN
      RAISE EXCEPTION 'You must be at the venue to check in.' USING ERRCODE = '42501';
    END IF;
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

  -- Ledger entries
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

  -- Atomic total update
  INSERT INTO public.user_rankings (user_id, total_points, updated_at)
  VALUES (uid, v_award, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET total_points = public.user_rankings.total_points + EXCLUDED.total_points,
      updated_at = NOW()
  RETURNING total_points INTO v_total;

  -- Maintain the denormalized venue counter
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
    'total_points', v_total
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_in_venue(TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_user_points(UUID) TO authenticated;

-- ========== BACKFILL ==========
-- Seed the ledger from existing check-ins so history & totals stay consistent.
INSERT INTO public.points_events (user_id, source, points, venue_id, ref_id, created_at)
SELECT c.user_id, 'check_in', COALESCE(c.points_awarded, 25), c.venue_id, c.id, c.created_at
FROM public.check_ins c
WHERE NOT EXISTS (
  SELECT 1 FROM public.points_events pe
  WHERE pe.ref_id = c.id AND pe.source = 'check_in'
);
