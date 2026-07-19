-- Rewards catalog & redemptions
-- Run after 031_checkin_points_engine.sql
--
-- Lets members spend points on venue- or platform-funded perks. Redeeming issues
-- a one-time code that venue staff validate in the business app. All point
-- movement flows through points_events so totals stay auditable.

-- ========== REWARDS CATALOG ==========
CREATE TABLE IF NOT EXISTS public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id TEXT REFERENCES public.venues(id) ON DELETE CASCADE, -- NULL = platform-wide
  title TEXT NOT NULL,
  description TEXT,
  reward_type TEXT NOT NULL DEFAULT 'perk'
    CHECK (reward_type IN ('perk', 'discount', 'free_item', 'experience')),
  cost_points INTEGER NOT NULL CHECK (cost_points > 0),
  image_url TEXT,
  terms TEXT,
  stock INTEGER,                 -- NULL = unlimited
  redeemed_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rewards_active_idx ON public.rewards (active) WHERE active;
CREATE INDEX IF NOT EXISTS rewards_venue_idx ON public.rewards (venue_id);

ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rewards_select_active ON public.rewards;
CREATE POLICY rewards_select_active
  ON public.rewards FOR SELECT
  USING (active OR venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS rewards_manage_own_venue ON public.rewards;
CREATE POLICY rewards_manage_own_venue
  ON public.rewards FOR ALL
  TO authenticated
  USING (venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid()))
  WITH CHECK (venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid()));

-- ========== REDEMPTIONS ==========
CREATE TABLE IF NOT EXISTS public.reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id UUID NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  venue_id TEXT REFERENCES public.venues(id) ON DELETE SET NULL,
  cost_points INTEGER NOT NULL,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'issued'
    CHECK (status IN ('issued', 'redeemed', 'expired', 'void')),
  redeemed_at TIMESTAMPTZ,
  redeemed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS redemptions_user_idx ON public.reward_redemptions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS redemptions_venue_idx ON public.reward_redemptions (venue_id, status);

ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

-- Members see their own; venue owners see redemptions for their venues.
DROP POLICY IF EXISTS redemptions_select_own_or_venue ON public.reward_redemptions;
CREATE POLICY redemptions_select_own_or_venue
  ON public.reward_redemptions FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid())
  );
-- Inserts/updates only via the SECURITY DEFINER RPCs below.

-- ========== REDEEM RPC (member spends points) ==========
CREATE OR REPLACE FUNCTION public.redeem_reward(p_reward_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid           UUID := auth.uid();
  v_reward      RECORD;
  v_points      INTEGER;
  v_code        TEXT;
  v_redemption  UUID;
  v_total       INTEGER;
  v_attempts    INTEGER := 0;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_reward FROM public.rewards WHERE id = p_reward_id FOR UPDATE;
  IF NOT FOUND OR NOT v_reward.active THEN
    RAISE EXCEPTION 'Reward not available';
  END IF;

  IF v_reward.stock IS NOT NULL AND v_reward.redeemed_count >= v_reward.stock THEN
    RAISE EXCEPTION 'This reward is out of stock';
  END IF;

  SELECT COALESCE(total_points, 0) INTO v_points
  FROM public.user_rankings WHERE user_id = uid;

  IF COALESCE(v_points, 0) < v_reward.cost_points THEN
    RAISE EXCEPTION 'Not enough points to redeem this reward';
  END IF;

  -- Unique redemption code (retry on the tiny chance of collision).
  LOOP
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    BEGIN
      INSERT INTO public.reward_redemptions
        (reward_id, user_id, venue_id, cost_points, code, expires_at)
      VALUES
        (p_reward_id, uid, v_reward.venue_id, v_reward.cost_points, v_code,
         NOW() + INTERVAL '30 days')
      RETURNING id INTO v_redemption;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      v_attempts := v_attempts + 1;
      IF v_attempts > 5 THEN RAISE EXCEPTION 'Could not generate redemption code'; END IF;
    END;
  END LOOP;

  INSERT INTO public.points_events (user_id, source, points, venue_id, ref_id)
  VALUES (uid, 'redeem', -v_reward.cost_points, v_reward.venue_id, v_redemption);

  UPDATE public.user_rankings
  SET total_points = GREATEST(total_points - v_reward.cost_points, 0), updated_at = NOW()
  WHERE user_id = uid
  RETURNING total_points INTO v_total;

  UPDATE public.rewards
  SET redeemed_count = redeemed_count + 1, updated_at = NOW()
  WHERE id = p_reward_id;

  RETURN jsonb_build_object(
    'redemption_id', v_redemption,
    'code', v_code,
    'reward_title', v_reward.title,
    'cost_points', v_reward.cost_points,
    'total_points', v_total,
    'expires_at', (NOW() + INTERVAL '30 days')
  );
END;
$$;

-- ========== VALIDATE RPC (venue staff marks a code as used) ==========
CREATE OR REPLACE FUNCTION public.validate_redemption(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid     UUID := auth.uid();
  v_row   RECORD;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Sign in required' USING ERRCODE = '42501';
  END IF;

  SELECT r.*, rw.title AS reward_title, u.name AS member_name
  INTO v_row
  FROM public.reward_redemptions r
  JOIN public.rewards rw ON rw.id = r.reward_id
  JOIN public.users u ON u.id = r.user_id
  WHERE upper(r.code) = upper(p_code)
  FOR UPDATE OF r;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Code not found';
  END IF;

  -- Only the owner of the reward's venue may validate it. Platform-wide rewards
  -- (no venue) can be validated by any venue owner.
  IF v_row.venue_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.venues WHERE id = v_row.venue_id AND owner_id = uid
     ) THEN
    RAISE EXCEPTION 'Not authorized to validate this code';
  END IF;

  IF v_row.status = 'redeemed' THEN
    RAISE EXCEPTION 'Code already redeemed on %',
      to_char(v_row.redeemed_at, 'Mon DD, YYYY HH24:MI');
  ELSIF v_row.status <> 'issued' THEN
    RAISE EXCEPTION 'Code is % and cannot be used', v_row.status;
  END IF;

  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < NOW() THEN
    UPDATE public.reward_redemptions SET status = 'expired' WHERE id = v_row.id;
    RAISE EXCEPTION 'Code has expired';
  END IF;

  UPDATE public.reward_redemptions
  SET status = 'redeemed', redeemed_at = NOW(), redeemed_by = uid
  WHERE id = v_row.id;

  RETURN jsonb_build_object(
    'reward_title', v_row.reward_title,
    'member_name', v_row.member_name,
    'cost_points', v_row.cost_points,
    'redeemed_at', NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_reward(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_redemption(TEXT) TO authenticated;
