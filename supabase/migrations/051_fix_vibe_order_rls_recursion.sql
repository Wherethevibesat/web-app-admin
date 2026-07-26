-- Fix infinite recursion (42P17) on My Plans / venue vibe bookings.
-- night_package_orders_select_venue subqueried night_package_order_stops, whose
-- policy subqueried night_package_orders — circular under RLS.
-- Use SECURITY DEFINER helpers (same pattern as 030_fix_users_rls_recursion).

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

CREATE OR REPLACE FUNCTION public.user_owns_night_package_order(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.night_package_orders o
    WHERE o.id = p_order_id
      AND o.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_venue_on_night_package_order(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.night_package_order_stops s
    JOIN public.venues v ON v.id = s.venue_id
    WHERE s.order_id = p_order_id
      AND v.owner_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_owns_venue(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_night_package_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_venue_on_night_package_order(uuid) TO authenticated;

DROP POLICY IF EXISTS night_package_orders_select_venue ON public.night_package_orders;
CREATE POLICY night_package_orders_select_venue
  ON public.night_package_orders FOR SELECT
  TO authenticated
  USING (public.user_is_venue_on_night_package_order(id));

DROP POLICY IF EXISTS night_package_order_stops_select ON public.night_package_order_stops;
CREATE POLICY night_package_order_stops_select
  ON public.night_package_order_stops FOR SELECT
  TO authenticated
  USING (
    public.user_owns_night_package_order(order_id)
    OR public.user_owns_venue(venue_id)
  );
