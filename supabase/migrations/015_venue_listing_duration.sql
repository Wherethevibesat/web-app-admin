-- Venue listing duration (fee + months) and expiry tracking on venues
-- Run after 014_claim_driver_role.sql

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS venue_listing_months INT NOT NULL DEFAULT 3
    CHECK (venue_listing_months >= 1);

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS listing_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS listing_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS listing_payment_intent_id TEXT;

CREATE INDEX IF NOT EXISTS idx_venues_listing_expires ON public.venues(listing_expires_at);

COMMENT ON COLUMN public.platform_settings.venue_submission_fee IS
  'One-time venue listing fee (USD) for the configured listing duration.';
COMMENT ON COLUMN public.platform_settings.venue_listing_months IS
  'Number of months a paid venue listing stays live before renewal.';
