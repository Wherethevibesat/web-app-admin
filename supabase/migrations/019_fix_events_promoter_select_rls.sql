-- Fix infinite recursion in events_select_promoter (42P17).
-- The venues join in the policy caused circular RLS checks with promoter_venue_links.

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
