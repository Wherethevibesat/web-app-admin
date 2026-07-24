-- Build Your Night — multi-venue package marketplace (MVP)
-- Run after 039_remove_points_rewards_leaderboard.sql
--
-- Venues publish priced "stops". WTVA assembles published night packages.
-- Guests pay WTVA once (platform-collected). Venue payouts are recorded for
-- later settlement (manual/Connect later) — no multi-destination Stripe split.

-- ========== COMMISSION SETTING ==========
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS night_package_commission_pct NUMERIC(5,2) NOT NULL DEFAULT 15
    CHECK (night_package_commission_pct >= 0 AND night_package_commission_pct <= 100);

-- ========== VENUE STOP OFFERS ==========
-- A sellable stop a venue contributes to packages (brunch, day party, etc.).
CREATE TABLE IF NOT EXISTS public.package_stop_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id TEXT NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  slot_type TEXT NOT NULL
    CHECK (slot_type IN ('brunch', 'day_party', 'lounge', 'night', 'after_hours', 'other')),
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  inclusions TEXT[] NOT NULL DEFAULT '{}',
  capacity INTEGER,                          -- NULL = unlimited
  arrival_window TEXT,                       -- e.g. "11:00 AM – 2:00 PM"
  contract_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  contract_accepted_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'archived')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  image_url TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS package_stop_offers_venue_idx
  ON public.package_stop_offers (venue_id, status);
CREATE INDEX IF NOT EXISTS package_stop_offers_approved_idx
  ON public.package_stop_offers (status, is_active)
  WHERE status = 'approved' AND is_active;

ALTER TABLE public.package_stop_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS package_stop_offers_select ON public.package_stop_offers;
CREATE POLICY package_stop_offers_select
  ON public.package_stop_offers FOR SELECT
  USING (
    (status = 'approved' AND is_active = TRUE)
    OR venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS package_stop_offers_insert_owner ON public.package_stop_offers;
CREATE POLICY package_stop_offers_insert_owner
  ON public.package_stop_offers FOR INSERT
  TO authenticated
  WITH CHECK (
    venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS package_stop_offers_update_owner ON public.package_stop_offers;
CREATE POLICY package_stop_offers_update_owner
  ON public.package_stop_offers FOR UPDATE
  TO authenticated
  USING (venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid()))
  WITH CHECK (venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS package_stop_offers_delete_owner ON public.package_stop_offers;
CREATE POLICY package_stop_offers_delete_owner
  ON public.package_stop_offers FOR DELETE
  TO authenticated
  USING (venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid()));

-- ========== NIGHT PACKAGES (curated flows) ==========
CREATE TABLE IF NOT EXISTS public.night_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  template_key TEXT,                         -- date_night | sunday_funday | birthday | custom
  city TEXT NOT NULL DEFAULT 'houston',
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  starts_on DATE,                            -- package date (nullable = evergreen template)
  party_size_min INTEGER NOT NULL DEFAULT 1,
  party_size_max INTEGER NOT NULL DEFAULT 20,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS night_packages_published_idx
  ON public.night_packages (status, sort_order)
  WHERE status = 'published';

ALTER TABLE public.night_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS night_packages_select_published ON public.night_packages;
CREATE POLICY night_packages_select_published
  ON public.night_packages FOR SELECT
  USING (status = 'published');

-- ========== PACKAGE ↔ STOP JOIN ==========
CREATE TABLE IF NOT EXISTS public.night_package_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.night_packages(id) ON DELETE CASCADE,
  stop_offer_id UUID NOT NULL REFERENCES public.package_stop_offers(id) ON DELETE RESTRICT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  scheduled_label TEXT,                      -- e.g. "11:00 AM" or "Step 1"
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (package_id, stop_offer_id)
);

CREATE INDEX IF NOT EXISTS night_package_stops_package_idx
  ON public.night_package_stops (package_id, sort_order);

ALTER TABLE public.night_package_stops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS night_package_stops_select ON public.night_package_stops;
CREATE POLICY night_package_stops_select
  ON public.night_package_stops FOR SELECT
  USING (
    package_id IN (SELECT id FROM public.night_packages WHERE status = 'published')
  );

-- ========== ORDERS ==========
CREATE TABLE IF NOT EXISTS public.night_package_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.night_packages(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  party_size INTEGER NOT NULL DEFAULT 1 CHECK (party_size > 0),
  subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents >= 0),
  commission_cents INTEGER NOT NULL DEFAULT 0 CHECK (commission_cents >= 0),
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded', 'failed')),
  stripe_payment_intent_id TEXT,
  confirmation_code TEXT NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  guest_name TEXT,
  guest_email TEXT,
  notes TEXT NOT NULL DEFAULT '',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS night_package_orders_pi_unique
  ON public.night_package_orders (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS night_package_orders_user_idx
  ON public.night_package_orders (user_id, created_at DESC);

ALTER TABLE public.night_package_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS night_package_orders_select_own ON public.night_package_orders;
CREATE POLICY night_package_orders_select_own
  ON public.night_package_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Inserts/updates via SECURITY DEFINER / service role only.

CREATE TABLE IF NOT EXISTS public.night_package_order_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.night_package_orders(id) ON DELETE CASCADE,
  stop_offer_id UUID NOT NULL REFERENCES public.package_stop_offers(id) ON DELETE RESTRICT,
  venue_id TEXT NOT NULL REFERENCES public.venues(id) ON DELETE RESTRICT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  slot_type TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  party_size INTEGER NOT NULL,
  line_total_cents INTEGER NOT NULL,
  venue_payout_cents INTEGER NOT NULL DEFAULT 0,
  scheduled_label TEXT,
  redemption_code TEXT NOT NULL DEFAULT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'checked_in', 'no_show', 'cancelled', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS night_package_order_stops_order_idx
  ON public.night_package_order_stops (order_id, sort_order);
CREATE INDEX IF NOT EXISTS night_package_order_stops_venue_idx
  ON public.night_package_order_stops (venue_id, status);

ALTER TABLE public.night_package_order_stops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS night_package_order_stops_select ON public.night_package_order_stops;
CREATE POLICY night_package_order_stops_select
  ON public.night_package_order_stops FOR SELECT
  TO authenticated
  USING (
    order_id IN (SELECT id FROM public.night_package_orders WHERE user_id = auth.uid())
    OR venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid())
  );

-- ========== HELPER: package total from stops ==========
CREATE OR REPLACE FUNCTION public.night_package_subtotal_cents(p_package_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(o.price_cents), 0)::INTEGER
  FROM public.night_package_stops s
  JOIN public.package_stop_offers o ON o.id = s.stop_offer_id
  WHERE s.package_id = p_package_id
    AND o.status = 'approved'
    AND o.is_active = TRUE;
$$;

GRANT EXECUTE ON FUNCTION public.night_package_subtotal_cents(UUID) TO authenticated, anon;
