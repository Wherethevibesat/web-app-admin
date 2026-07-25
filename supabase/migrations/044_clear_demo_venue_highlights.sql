-- Clear seeded marketing copy on why_picked — that field is venue-authored.
-- Safe to re-run.

UPDATE public.package_stop_offers
SET
  why_picked = '',
  updated_at = NOW()
WHERE why_picked IN (
  'One of Houston''s most popular brunches for groups before heading into the day-party scene — and only minutes from your next stop.',
  'Keeps the momentum after brunch without a long ride across town — peak weekend day-party energy.',
  'Finishes the vibe at one of the city''s hottest rooms without wasting Saturday on the door.'
);

COMMENT ON COLUMN public.package_stop_offers.why_picked IS
  'Venue-authored guest highlight shown when customers build a vibe';
