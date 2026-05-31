-- Fix infinite recursion (42P17) when venue owners query events.
-- Policies that subquery public.users under RLS can recurse; use SECURITY DEFINER helpers instead.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.user_owns_venue(p_venue_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.venues v
    WHERE v.id = p_venue_id AND v.owner_id = auth.uid()
  );
$$;

-- Replace recursive users policies with non-recursive ones.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select"
  ON public.users FOR SELECT
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "users_insert_own"
  ON public.users FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

-- Events: venue owners can read events for their venues.
DROP POLICY IF EXISTS "events_select_owner" ON public.events;
CREATE POLICY "events_select_owner"
  ON public.events FOR SELECT
  USING (
    submitted_by = auth.uid()
    OR public.user_owns_venue(venue_id)
  );

-- Re-assert promoter select without venues join (see 019).
DROP POLICY IF EXISTS "events_select_promoter" ON public.events;
CREATE POLICY "events_select_promoter"
  ON public.events FOR SELECT
  USING (
    created_by_promoter_id = auth.uid()
    OR (
      status = 'published'
      AND EXISTS (
        SELECT 1 FROM public.promoter_venue_links l
        WHERE l.promoter_id = auth.uid()
          AND l.status = 'approved'
          AND l.venue_id = events.venue_id
      )
    )
  );

DROP POLICY IF EXISTS "events_update_promoter_event_review" ON public.events;
CREATE POLICY "events_update_promoter_event_review"
  ON public.events FOR UPDATE
  USING (
    created_by_promoter_id IS NOT NULL
    AND (public.user_owns_venue(venue_id) OR public.is_admin())
  );

DROP POLICY IF EXISTS "promoter_venue_links_select" ON public.promoter_venue_links;
CREATE POLICY "promoter_venue_links_select"
  ON public.promoter_venue_links FOR SELECT
  USING (
    promoter_id = auth.uid()
    OR public.user_owns_venue(venue_id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "promoter_venue_links_update_reviewers" ON public.promoter_venue_links;
CREATE POLICY "promoter_venue_links_update_reviewers"
  ON public.promoter_venue_links FOR UPDATE
  USING (public.user_owns_venue(venue_id) OR public.is_admin());

DROP POLICY IF EXISTS "promoter_offers_select" ON public.promoter_offers;
CREATE POLICY "promoter_offers_select"
  ON public.promoter_offers FOR SELECT
  USING (
    (
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
    )
    OR promoter_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "promoter_inquiries_select" ON public.promoter_inquiries;
CREATE POLICY "promoter_inquiries_select"
  ON public.promoter_inquiries FOR SELECT
  USING (
    promoter_id = auth.uid()
    OR customer_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "promoter_orders_select" ON public.promoter_orders;
CREATE POLICY "promoter_orders_select"
  ON public.promoter_orders FOR SELECT
  USING (
    customer_id = auth.uid()
    OR promoter_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "event_series_select_public" ON public.event_series;
CREATE POLICY "event_series_select_public"
  ON public.event_series FOR SELECT
  USING (
    status = 'published'
    OR submitted_by = auth.uid()
    OR public.user_owns_venue(venue_id)
  );
