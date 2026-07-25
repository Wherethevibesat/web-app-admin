-- Curated Vibes storytelling fields (UI says Vibe; tables stay night_packages).
-- Run after 040_build_your_night_packages.sql

ALTER TABLE public.night_packages
  ADD COLUMN IF NOT EXISTS tagline TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS why_this_works TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS perfect_for TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS not_ideal_for TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS diy_compare_cents INTEGER,
  ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS groups_booked INTEGER,
  ADD COLUMN IF NOT EXISTS vibe_tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS energy_score NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS travel_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS crowd_label TEXT,
  ADD COLUMN IF NOT EXISTS music_tags TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.package_stop_offers
  ADD COLUMN IF NOT EXISTS why_picked TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS duration_label TEXT,
  ADD COLUMN IF NOT EXISTS dress_code TEXT,
  ADD COLUMN IF NOT EXISTS crowd_label TEXT;

COMMENT ON COLUMN public.night_packages.tagline IS 'Short emotional line under vibe title';
COMMENT ON COLUMN public.night_packages.diy_compare_cents IS 'DIY compare price in cents for Save $X';
COMMENT ON COLUMN public.package_stop_offers.why_picked IS 'Venue-authored guest highlight shown when customers build a vibe';
