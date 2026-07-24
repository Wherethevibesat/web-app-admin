-- Demo Build Your Night data (safe to re-run).
-- Requires: 040_build_your_night_packages.sql + at least one venue row.
-- Creates 3 approved stop offers on the first venue and one published package.

DO $$
DECLARE
  v_venue_id TEXT;
  v_brunch UUID;
  v_day UUID;
  v_night UUID;
  v_pkg UUID;
BEGIN
  SELECT id INTO v_venue_id FROM public.venues ORDER BY created_at NULLS LAST, id LIMIT 1;
  IF v_venue_id IS NULL THEN
    RAISE NOTICE '041 seed skipped: no venues found';
    RETURN;
  END IF;

  -- Skip if a demo package already exists
  IF EXISTS (
    SELECT 1 FROM public.night_packages WHERE slug = 'out-of-town-weekend-demo'
  ) THEN
    RAISE NOTICE '041 seed skipped: demo package already exists';
    RETURN;
  END IF;

  INSERT INTO public.package_stop_offers (
    venue_id, title, description, slot_type, price_cents, inclusions,
    arrival_window, contract_accepted, contract_accepted_at, status, is_active
  ) VALUES (
    v_venue_id,
    'Brunch Welcome',
    'Bottomless brunch stop to start the day.',
    'brunch',
    7500,
    ARRAY['Reserved seating', 'Bottomless mimosas', 'Host greeting'],
    '11:00 AM – 1:30 PM',
    TRUE,
    NOW(),
    'approved',
    TRUE
  ) RETURNING id INTO v_brunch;

  INSERT INTO public.package_stop_offers (
    venue_id, title, description, slot_type, price_cents, inclusions,
    arrival_window, contract_accepted, contract_accepted_at, status, is_active
  ) VALUES (
    v_venue_id,
    'Day Party Pass',
    'Afternoon pool / patio energy.',
    'day_party',
    12500,
    ARRAY['Entry', 'One welcome cocktail', 'VIP area access'],
    '2:00 PM – 6:00 PM',
    TRUE,
    NOW(),
    'approved',
    TRUE
  ) RETURNING id INTO v_day;

  INSERT INTO public.package_stop_offers (
    venue_id, title, description, slot_type, price_cents, inclusions,
    arrival_window, contract_accepted, contract_accepted_at, status, is_active
  ) VALUES (
    v_venue_id,
    'Night Main Event',
    'Prime-time nightclub / lounge package.',
    'night',
    20000,
    ARRAY['Guest list entry', 'Bottle service credit', 'Host walk-in'],
    '10:30 PM – 1:30 AM',
    TRUE,
    NOW(),
    'approved',
    TRUE
  ) RETURNING id INTO v_night;

  INSERT INTO public.night_packages (
    slug, title, subtitle, description, template_key, city,
    status, party_size_min, party_size_max, sort_order, is_featured, published_at
  ) VALUES (
    'out-of-town-weekend-demo',
    'Out of Town Weekend',
    'Brunch → day party → night — one checkout.',
    'A curated Houston flow for visiting crews. Swap stops or add experiences before you pay.',
    'out_of_town',
    'houston',
    'published',
    2,
    12,
    0,
    TRUE,
    NOW()
  ) RETURNING id INTO v_pkg;

  INSERT INTO public.night_package_stops (package_id, stop_offer_id, sort_order, scheduled_label)
  VALUES
    (v_pkg, v_brunch, 0, '11:00 AM'),
    (v_pkg, v_day, 1, '2:00 PM'),
    (v_pkg, v_night, 2, '10:30 PM');

  RAISE NOTICE '041 seed created demo package % on venue %', v_pkg, v_venue_id;
END $$;
