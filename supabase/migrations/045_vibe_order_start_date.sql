-- Soft preferred start date for vibe bookings (customer-selected).
-- Stops may spill past midnight; we store the calendar start day only.

ALTER TABLE public.night_package_orders
  ADD COLUMN IF NOT EXISTS starts_on DATE;

COMMENT ON COLUMN public.night_package_orders.starts_on IS
  'Guest preferred vibe start date (soft availability; not hard inventory)';

CREATE INDEX IF NOT EXISTS night_package_orders_starts_on_idx
  ON public.night_package_orders (starts_on)
  WHERE starts_on IS NOT NULL;
