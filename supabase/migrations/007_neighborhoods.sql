-- Canonical neighborhoods per city (Houston first; multi-city ready)
-- Run after 006_v2_messaging_and_orders.sql

CREATE TABLE IF NOT EXISTS public.neighborhoods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL DEFAULT 'Houston',
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (city, slug),
  UNIQUE (city, name)
);

CREATE INDEX IF NOT EXISTS idx_neighborhoods_city_list
  ON public.neighborhoods (city, is_active, sort_order, name);

ALTER TABLE public.neighborhoods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "neighborhoods_select_active" ON public.neighborhoods;
CREATE POLICY "neighborhoods_select_active"
  ON public.neighborhoods FOR SELECT
  USING (is_active = true);

-- Seed Houston neighborhoods (matches Flutter houston_neighborhoods.dart)
DO $$
DECLARE
  names TEXT[] := ARRAY[
    'Downtown', 'Midtown', 'Montrose', 'Heights', 'Rice Village', 'West University',
    'River Oaks', 'Upper Kirby', 'Museum District', 'Medical Center', 'East End',
    'Washington Avenue', 'EaDo (East Downtown)', 'The Woodlands', 'Sugar Land', 'Katy',
    'Cypress', 'Pearland', 'Spring', 'Kemah', 'Clear Lake', 'Galveston', 'Memorial',
    'Energy Corridor', 'Greenway Plaza', 'Galleria/Uptown', 'Westchase', 'Chinatown',
    'Little Saigon', 'Third Ward', 'Fourth Ward', 'Fifth Ward', 'Sixth Ward',
    'Greater Heights', 'Norhill', 'Shady Acres', 'Oak Forest', 'Garden Oaks',
    'Timber Crest', 'Afton Oaks', 'Briargrove', 'Tanglewood', 'Westbury', 'Meyerland',
    'Bellaire', 'Southside Place', 'Piney Point Village', 'Hunters Creek Village',
    'Bunker Hill Village', 'Hedwig Village', 'Hilshire Village', 'Spring Branch',
    'Gulfton', 'Sharpstown', 'Alief', 'Kashmere Gardens', 'Trinity Gardens',
    'Denver Harbor', 'Near Northside', 'Near Northwest', 'Acres Homes',
    'Independence Heights', 'Greater Inwood', 'Lazybrook/Timbergrove',
    'Shepherd Park Plaza', 'Garden Villas', 'Pecan Park', 'Park Place', 'Pasadena',
    'Baytown', 'Humble', 'Kingwood', 'Atascocita', 'Crosby', 'Channelview',
    'Deer Park', 'La Porte', 'Seabrook', 'League City', 'Friendswood',
    'Missouri City', 'Stafford', 'Richmond', 'Rosenberg', 'Fulshear', 'Tomball',
    'Magnolia', 'Conroe', 'Huntsville', 'Other'
  ];
  n TEXT;
  s TEXT;
  i INT;
BEGIN
  FOR i IN 1..array_length(names, 1) LOOP
    n := names[i];
    s := lower(trim(both '-' from regexp_replace(regexp_replace(n, '[^a-zA-Z0-9]+', '-', 'g'), '-+', '-', 'g')));
    INSERT INTO public.neighborhoods (city, name, slug, sort_order)
    VALUES ('Houston', n, s, i)
    ON CONFLICT (city, slug) DO NOTHING;
  END LOOP;
END $$;
