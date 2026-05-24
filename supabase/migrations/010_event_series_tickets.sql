-- Event series, recurrence, ticket tiers, and customer registrations
-- Run after 009_paid_event_publish_rls.sql

-- ========== SERIES ==========
CREATE TABLE IF NOT EXISTS public.event_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id TEXT REFERENCES public.venues(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  event_type TEXT NOT NULL,
  neighborhood TEXT,
  image_url TEXT,
  submitted_by UUID REFERENCES public.users(id),
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('draft', 'pending_review', 'published', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS series_id UUID REFERENCES public.event_series(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS occurrence_index INT;

CREATE INDEX IF NOT EXISTS idx_events_series_id ON public.events(series_id);

-- ========== RECURRENCE ==========
CREATE TABLE IF NOT EXISTS public.event_recurrence_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id UUID NOT NULL REFERENCES public.event_series(id) ON DELETE CASCADE,
  freq TEXT NOT NULL DEFAULT 'weekly' CHECK (freq IN ('weekly')),
  interval_weeks INT NOT NULL DEFAULT 1 CHECK (interval_weeks >= 1),
  by_weekday SMALLINT[] NOT NULL DEFAULT '{}',
  until_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurrence_series ON public.event_recurrence_rules(series_id);

-- ========== TICKET TIERS ==========
CREATE TABLE IF NOT EXISTS public.event_ticket_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Free RSVP',
  description TEXT DEFAULT '',
  price_cents INT NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  capacity INT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_tiers_event ON public.event_ticket_tiers(event_id);

-- ========== REGISTRATIONS ==========
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES public.event_ticket_tiers(id),
  user_id UUID NOT NULL REFERENCES public.users(id),
  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'refunded')),
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  amount_cents INT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, event_id, tier_id)
);

CREATE INDEX IF NOT EXISTS idx_registrations_event ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_user ON public.event_registrations(user_id);

-- ========== RLS ==========
ALTER TABLE public.event_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_recurrence_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_ticket_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_series_select_public" ON public.event_series;
CREATE POLICY "event_series_select_public"
  ON public.event_series FOR SELECT
  USING (
    status = 'published'
    OR submitted_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = event_series.venue_id AND v.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "event_series_insert_owner" ON public.event_series;
CREATE POLICY "event_series_insert_owner"
  ON public.event_series FOR INSERT
  WITH CHECK (
    submitted_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = venue_id AND v.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "event_series_update_owner" ON public.event_series;
CREATE POLICY "event_series_update_owner"
  ON public.event_series FOR UPDATE
  USING (submitted_by = auth.uid())
  WITH CHECK (submitted_by = auth.uid());

DROP POLICY IF EXISTS "recurrence_select" ON public.event_recurrence_rules;
CREATE POLICY "recurrence_select"
  ON public.event_recurrence_rules FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.event_series s
    WHERE s.id = event_recurrence_rules.series_id
      AND (s.status = 'published' OR s.submitted_by = auth.uid())
  ));

DROP POLICY IF EXISTS "recurrence_insert_owner" ON public.event_recurrence_rules;
CREATE POLICY "recurrence_insert_owner"
  ON public.event_recurrence_rules FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.event_series s
    JOIN public.venues v ON v.id = s.venue_id
    WHERE s.id = series_id AND v.owner_id = auth.uid() AND s.submitted_by = auth.uid()
  ));

DROP POLICY IF EXISTS "ticket_tiers_select" ON public.event_ticket_tiers;
CREATE POLICY "ticket_tiers_select"
  ON public.event_ticket_tiers FOR SELECT
  USING (
  (
    is_active = true AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_ticket_tiers.event_id AND e.status = 'published'
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.venues v ON v.id = e.venue_id
    WHERE e.id = event_ticket_tiers.event_id AND v.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_ticket_tiers.event_id AND e.submitted_by = auth.uid()
  )
  );

DROP POLICY IF EXISTS "ticket_tiers_insert_owner" ON public.event_ticket_tiers;
CREATE POLICY "ticket_tiers_insert_owner"
  ON public.event_ticket_tiers FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.venues v ON v.id = e.venue_id
    WHERE e.id = event_id AND v.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "ticket_tiers_update_owner" ON public.event_ticket_tiers;
CREATE POLICY "ticket_tiers_update_owner"
  ON public.event_ticket_tiers FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.venues v ON v.id = e.venue_id
    WHERE e.id = event_ticket_tiers.event_id AND v.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "registrations_select" ON public.event_registrations;
CREATE POLICY "registrations_select"
  ON public.event_registrations FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.venues v ON v.id = e.venue_id
      WHERE e.id = event_registrations.event_id AND v.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "registrations_insert_own" ON public.event_registrations;
CREATE POLICY "registrations_insert_own"
  ON public.event_registrations FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.status = 'published'
    )
  );

DROP POLICY IF EXISTS "registrations_update_own" ON public.event_registrations;
CREATE POLICY "registrations_update_own"
  ON public.event_registrations FOR UPDATE
  USING (user_id = auth.uid());
