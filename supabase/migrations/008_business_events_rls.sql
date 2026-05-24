-- Venue owners can submit events for their venues (pending admin review)
-- Run after 007_neighborhoods.sql

DROP POLICY IF EXISTS "events_select_owner" ON public.events;
CREATE POLICY "events_select_owner"
  ON public.events FOR SELECT
  USING (
    submitted_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = events.venue_id AND v.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "events_insert_owner" ON public.events;
CREATE POLICY "events_insert_owner"
  ON public.events FOR INSERT
  WITH CHECK (
    submitted_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = venue_id AND v.owner_id = auth.uid()
    )
    AND status IN ('draft', 'pending_review')
    AND featured = false
  );

DROP POLICY IF EXISTS "events_update_owner" ON public.events;
CREATE POLICY "events_update_owner"
  ON public.events FOR UPDATE
  USING (
    submitted_by = auth.uid()
    AND status IN ('draft', 'pending_review')
  )
  WITH CHECK (
    submitted_by = auth.uid()
    AND status IN ('draft', 'pending_review', 'cancelled')
    AND featured = false
  );
