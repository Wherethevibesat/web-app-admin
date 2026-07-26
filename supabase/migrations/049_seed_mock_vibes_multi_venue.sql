-- Enable DIY pool on existing Love Bar demo stops.
-- Full multi-venue mock inventory + curated packages:
--   python3 web-app-admin/scripts/seed_mock_vibes.py
-- (idempotent; tagged [WTVA_MOCK_SEED_049])

UPDATE public.package_stop_offers
SET diy_pool = TRUE, is_active = TRUE, updated_at = NOW()
WHERE venue_id = 'love-bar-dbfd9cc6';
