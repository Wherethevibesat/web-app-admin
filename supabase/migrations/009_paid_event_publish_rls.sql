-- Paid event submissions publish immediately (venue owner insert/update)
-- Run after 008_business_events_rls.sql

DROP POLICY IF EXISTS "events_insert_owner" ON public.events;
CREATE POLICY "events_insert_owner"
  ON public.events FOR INSERT
  WITH CHECK (
    submitted_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = venue_id AND v.owner_id = auth.uid()
    )
    AND status IN ('draft', 'pending_review', 'published')
    AND featured = false
  );

DROP POLICY IF EXISTS "events_update_owner" ON public.events;
CREATE POLICY "events_update_owner"
  ON public.events FOR UPDATE
  USING (
    submitted_by = auth.uid()
    AND status IN ('draft', 'pending_review', 'published')
  )
  WITH CHECK (
    submitted_by = auth.uid()
    AND status IN ('draft', 'pending_review', 'published', 'cancelled')
    AND featured = false
  );

DROP POLICY IF EXISTS "platform_transactions_insert_owner" ON public.platform_transactions;
CREATE POLICY "platform_transactions_insert_owner"
  ON public.platform_transactions FOR INSERT
  WITH CHECK (user_id = auth.uid());
