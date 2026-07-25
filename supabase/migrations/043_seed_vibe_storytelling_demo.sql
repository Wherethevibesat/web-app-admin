-- Enrich demo vibe as Houston Rooftop Escape (safe to re-run).
-- Requires: 040, 041 (or existing out-of-town-weekend-demo), 042.

DO $$
DECLARE
  v_pkg UUID;
  v_brunch UUID;
  v_day UUID;
  v_night UUID;
BEGIN
  SELECT id INTO v_pkg
  FROM public.night_packages
  WHERE slug IN ('out-of-town-weekend-demo', 'houston-rooftop-escape')
  ORDER BY CASE WHEN slug = 'houston-rooftop-escape' THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_pkg IS NULL THEN
    RAISE NOTICE '043 skipped: no demo vibe found (run 041 first)';
    RETURN;
  END IF;

  UPDATE public.night_packages SET
    slug = 'houston-rooftop-escape',
    title = 'Houston Rooftop Escape',
    subtitle = 'Brunch → day party → VIP — one checkout.',
    tagline = 'The perfect Saturday if you want to experience Houston like a local.',
    description = 'A concierge-built Houston flow: start with brunch, move into day-party energy, finish with VIP nightlife — without the planning headache.',
    why_this_works = 'Designed by our concierge to keep you close to the city''s best venues while avoiding long waits and unnecessary travel. Travel between stops stays under 20 minutes while energy builds through the day.',
    perfect_for = ARRAY[
      'are visiting Houston',
      'want VIP without planning',
      'have 4–10 friends',
      'don''t know the city',
      'want one payment'
    ],
    not_ideal_for = ARRAY[
      'you''re looking for a quiet evening',
      'your budget is under $100/person',
      'you want country music venues'
    ],
    diy_compare_cents = 49500,
    rating = 4.9,
    groups_booked = 218,
    vibe_tags = ARRAY['Luxury', 'Rooftops', 'Visitors', 'VIP'],
    energy_score = 9.6,
    travel_minutes = 18,
    crowd_label = '25–35',
    music_tags = ARRAY['Hip-Hop', 'Afrobeats', 'R&B'],
    is_featured = TRUE,
    updated_at = NOW()
  WHERE id = v_pkg;

  SELECT nps.stop_offer_id INTO v_brunch
  FROM public.night_package_stops nps
  WHERE nps.package_id = v_pkg AND nps.sort_order = 0
  LIMIT 1;
  SELECT nps.stop_offer_id INTO v_day
  FROM public.night_package_stops nps
  WHERE nps.package_id = v_pkg AND nps.sort_order = 1
  LIMIT 1;
  SELECT nps.stop_offer_id INTO v_night
  FROM public.night_package_stops nps
  WHERE nps.package_id = v_pkg AND nps.sort_order = 2
  LIMIT 1;

  IF v_brunch IS NOT NULL THEN
    UPDATE public.package_stop_offers SET
      title = 'Brunch Welcome',
      description = 'Start your vibe with reserved seating, bottomless mimosas, and a hosted welcome.',
      -- Guest highlight is venue-authored; leave empty for venue owners to fill.
      why_picked = '',
      duration_label = '2.5 Hours',
      dress_code = 'Brunch Chic',
      crowd_label = '25–35',
      updated_at = NOW()
    WHERE id = v_brunch;
  END IF;

  IF v_day IS NOT NULL THEN
    UPDATE public.package_stop_offers SET
      title = 'Day Party Pass',
      description = 'Afternoon patio energy with VIP access and a welcome cocktail.',
      why_picked = '',
      duration_label = '4 Hours',
      dress_code = 'Stylish / Casual',
      crowd_label = '25–35',
      updated_at = NOW()
    WHERE id = v_day;
  END IF;

  IF v_night IS NOT NULL THEN
    UPDATE public.package_stop_offers SET
      title = 'VIP Night Main Event',
      description = 'Skip the line into prime-time nightlife with host walk-in and bottle credit.',
      why_picked = '',
      duration_label = '3 Hours',
      dress_code = 'Upscale Night',
      crowd_label = '25–35',
      updated_at = NOW()
    WHERE id = v_night;
  END IF;

  RAISE NOTICE '043 enriched vibe % as Houston Rooftop Escape', v_pkg;
END $$;
