-- Request-to-book when venues lack Stripe Connect.
-- Order: requested → awaiting_payment → paid (or cancelled / expired)
-- Stops: pending_venue → confirmed | declined | cancelled

ALTER TABLE public.night_package_orders
  DROP CONSTRAINT IF EXISTS night_package_orders_status_check;

ALTER TABLE public.night_package_orders
  ADD CONSTRAINT night_package_orders_status_check
  CHECK (status IN (
    'pending',
    'requested',
    'awaiting_payment',
    'paid',
    'cancelled',
    'refunded',
    'failed',
    'expired'
  ));

ALTER TABLE public.night_package_orders
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS night_package_orders_requested_expires_idx
  ON public.night_package_orders (expires_at)
  WHERE status = 'requested';

ALTER TABLE public.night_package_order_stops
  DROP CONSTRAINT IF EXISTS night_package_order_stops_status_check;

ALTER TABLE public.night_package_order_stops
  ADD CONSTRAINT night_package_order_stops_status_check
  CHECK (status IN (
    'pending_venue',
    'confirmed',
    'declined',
    'checked_in',
    'no_show',
    'cancelled',
    'refunded'
  ));

ALTER TABLE public.night_package_order_stops
  ADD COLUMN IF NOT EXISTS venue_responded_at TIMESTAMPTZ;

-- Venue owners can read orders that include their stops (for date/party/status).
-- NOTE: Do not subquery night_package_order_stops here under RLS — that recurses
-- with night_package_order_stops_select. Migration 051 installs SECURITY DEFINER
-- helpers and the safe venue SELECT policy.

-- PII-safe summary: guest contact only after venues confirmed / paid.
CREATE OR REPLACE VIEW public.vibe_venue_order_summary
WITH (security_invoker = true) AS
SELECT
  id,
  package_id,
  user_id,
  party_size,
  subtotal_cents,
  commission_cents,
  total_cents,
  currency,
  status,
  confirmation_code,
  starts_on,
  expires_at,
  notes,
  paid_at,
  created_at,
  updated_at,
  CASE
    WHEN status IN ('awaiting_payment', 'paid') THEN guest_name
    ELSE NULL
  END AS guest_name,
  CASE
    WHEN status IN ('awaiting_payment', 'paid') THEN guest_email
    ELSE NULL
  END AS guest_email
FROM public.night_package_orders;

GRANT SELECT ON public.vibe_venue_order_summary TO authenticated;

COMMENT ON VIEW public.vibe_venue_order_summary IS
  'Venue-facing order fields; guest_name/email null while status=requested';
