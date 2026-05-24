-- Promoters: venue links, offers, inquiries, orders
-- Run after 015_venue_listing_duration.sql

-- ========== ROLE ==========
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'venueOwner', 'customer', 'driver', 'promoter'));

-- ========== PROMOTER PROFILE ==========
CREATE TABLE IF NOT EXISTS public.promoter_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  bio TEXT DEFAULT '',
  contact_phone TEXT,
  contact_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== PROMOTER <-> VENUE (approval required) ==========
CREATE TABLE IF NOT EXISTS public.promoter_venue_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  venue_id TEXT NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.users(id),
  reviewer_role TEXT CHECK (reviewer_role IN ('venueOwner', 'admin')),
  notes TEXT DEFAULT '',
  UNIQUE (promoter_id, venue_id)
);

CREATE INDEX IF NOT EXISTS idx_promoter_venue_links_promoter ON public.promoter_venue_links(promoter_id);
CREATE INDEX IF NOT EXISTS idx_promoter_venue_links_venue ON public.promoter_venue_links(venue_id);
CREATE INDEX IF NOT EXISTS idx_promoter_venue_links_status ON public.promoter_venue_links(status);

-- ========== EVENTS: promoter-created ==========
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS created_by_promoter_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS promoter_event_approval TEXT NOT NULL DEFAULT 'not_applicable'
    CHECK (promoter_event_approval IN ('not_applicable', 'pending', 'approved', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_events_promoter ON public.events(created_by_promoter_id);

-- ========== PROMOTER OFFERS (VIP / tables / sections) ==========
CREATE TABLE IF NOT EXISTS public.promoter_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  venue_id TEXT NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price_cents INT NOT NULL CHECK (price_cents >= 0),
  capacity INT NOT NULL DEFAULT 1 CHECK (capacity >= 1),
  allow_pay BOOLEAN NOT NULL DEFAULT true,
  allow_inquire BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promoter_offers_event ON public.promoter_offers(event_id);
CREATE INDEX IF NOT EXISTS idx_promoter_offers_promoter ON public.promoter_offers(promoter_id);

-- ========== INQUIRIES / BOOKING REQUESTS ==========
CREATE TABLE IF NOT EXISTS public.promoter_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES public.promoter_offers(id) ON DELETE CASCADE,
  promoter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT,
  party_size INT CHECK (party_size IS NULL OR party_size >= 1),
  arrival_time TEXT,
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'reserved', 'booked', 'declined', 'cancelled')),
  deposit_cents INT NOT NULL DEFAULT 0 CHECK (deposit_cents >= 0),
  promoter_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promoter_inquiries_promoter ON public.promoter_inquiries(promoter_id);
CREATE INDEX IF NOT EXISTS idx_promoter_inquiries_event ON public.promoter_inquiries(event_id);
CREATE INDEX IF NOT EXISTS idx_promoter_inquiries_status ON public.promoter_inquiries(status);

-- ========== ORDERS (Stripe later) ==========
CREATE TABLE IF NOT EXISTS public.promoter_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES public.promoter_offers(id) ON DELETE CASCADE,
  inquiry_id UUID REFERENCES public.promoter_inquiries(id) ON DELETE SET NULL,
  promoter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount_cents INT NOT NULL CHECK (amount_cents >= 0),
  is_deposit BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'paid', 'refunded', 'cancelled')),
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== RLS ==========
ALTER TABLE public.promoter_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promoter_venue_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promoter_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promoter_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promoter_orders ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "promoter_profiles_select" ON public.promoter_profiles;
CREATE POLICY "promoter_profiles_select"
  ON public.promoter_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "promoter_profiles_mutate_own" ON public.promoter_profiles;
CREATE POLICY "promoter_profiles_mutate_own"
  ON public.promoter_profiles FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Venue links
DROP POLICY IF EXISTS "promoter_venue_links_select" ON public.promoter_venue_links;
CREATE POLICY "promoter_venue_links_select"
  ON public.promoter_venue_links FOR SELECT
  USING (
    promoter_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = promoter_venue_links.venue_id AND v.owner_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

DROP POLICY IF EXISTS "promoter_venue_links_insert_promoter" ON public.promoter_venue_links;
CREATE POLICY "promoter_venue_links_insert_promoter"
  ON public.promoter_venue_links FOR INSERT
  WITH CHECK (promoter_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "promoter_venue_links_update_reviewers" ON public.promoter_venue_links;
CREATE POLICY "promoter_venue_links_update_reviewers"
  ON public.promoter_venue_links FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = promoter_venue_links.venue_id AND v.owner_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- Offers: public read active for published events; promoters manage own
DROP POLICY IF EXISTS "promoter_offers_select" ON public.promoter_offers;
CREATE POLICY "promoter_offers_select"
  ON public.promoter_offers FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = promoter_offers.event_id
        AND (
          e.status = 'published'
          OR e.created_by_promoter_id = auth.uid()
          OR e.submitted_by = auth.uid()
        )
    )
    OR promoter_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

DROP POLICY IF EXISTS "promoter_offers_mutate_promoter" ON public.promoter_offers;
CREATE POLICY "promoter_offers_mutate_promoter"
  ON public.promoter_offers FOR ALL
  USING (promoter_id = auth.uid())
  WITH CHECK (
    promoter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.promoter_venue_links l
      WHERE l.promoter_id = auth.uid()
        AND l.venue_id = promoter_offers.venue_id
        AND l.status = 'approved'
    )
  );

-- Inquiries
DROP POLICY IF EXISTS "promoter_inquiries_select" ON public.promoter_inquiries;
CREATE POLICY "promoter_inquiries_select"
  ON public.promoter_inquiries FOR SELECT
  USING (
    promoter_id = auth.uid()
    OR customer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

DROP POLICY IF EXISTS "promoter_inquiries_insert" ON public.promoter_inquiries;
CREATE POLICY "promoter_inquiries_insert"
  ON public.promoter_inquiries FOR INSERT
  WITH CHECK (
    customer_id IS NULL OR customer_id = auth.uid()
  );

DROP POLICY IF EXISTS "promoter_inquiries_update_promoter" ON public.promoter_inquiries;
CREATE POLICY "promoter_inquiries_update_promoter"
  ON public.promoter_inquiries FOR UPDATE
  USING (promoter_id = auth.uid());

-- Orders
DROP POLICY IF EXISTS "promoter_orders_select" ON public.promoter_orders;
CREATE POLICY "promoter_orders_select"
  ON public.promoter_orders FOR SELECT
  USING (
    customer_id = auth.uid()
    OR promoter_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

DROP POLICY IF EXISTS "promoter_orders_insert_customer" ON public.promoter_orders;
CREATE POLICY "promoter_orders_insert_customer"
  ON public.promoter_orders FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- Events: promoters select published + own; insert/update own promoter events
DROP POLICY IF EXISTS "events_select_promoter" ON public.events;
CREATE POLICY "events_select_promoter"
  ON public.events FOR SELECT
  USING (
    created_by_promoter_id = auth.uid()
    OR (
      status = 'published'
      AND EXISTS (
        SELECT 1 FROM public.promoter_venue_links l
        JOIN public.venues v ON v.id = l.venue_id
        WHERE l.promoter_id = auth.uid()
          AND l.status = 'approved'
          AND (events.venue_id = l.venue_id OR events.venue_id = v.id)
      )
    )
  );

DROP POLICY IF EXISTS "events_insert_promoter" ON public.events;
CREATE POLICY "events_insert_promoter"
  ON public.events FOR INSERT
  WITH CHECK (
    created_by_promoter_id = auth.uid()
    AND submitted_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.promoter_venue_links l
      WHERE l.promoter_id = auth.uid()
        AND l.venue_id = events.venue_id
        AND l.status = 'approved'
    )
    AND status IN ('draft', 'pending_review')
    AND promoter_event_approval IN ('pending', 'not_applicable')
  );

DROP POLICY IF EXISTS "events_update_promoter" ON public.events;
CREATE POLICY "events_update_promoter"
  ON public.events FOR UPDATE
  USING (
    created_by_promoter_id = auth.uid()
    AND status IN ('draft', 'pending_review')
  )
  WITH CHECK (created_by_promoter_id = auth.uid());

-- Venue owners / admin can approve promoter events
DROP POLICY IF EXISTS "events_update_promoter_event_review" ON public.events;
CREATE POLICY "events_update_promoter_event_review"
  ON public.events FOR UPDATE
  USING (
    created_by_promoter_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.venues v
        WHERE v.id = events.venue_id AND v.owner_id = auth.uid()
      )
      OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
    )
  );

-- Helper: count slots used on an offer
CREATE OR REPLACE FUNCTION public.promoter_offer_slots_used(p_offer_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INT
  FROM public.promoter_inquiries i
  WHERE i.offer_id = p_offer_id
    AND i.status IN ('reserved', 'booked');
$$;
