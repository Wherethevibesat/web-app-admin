-- DIY vibe pool: venues can go live for customer mix-and-match / random vibes
-- without waiting for curated (admin) approval. Curated packages still require status=approved.

ALTER TABLE public.package_stop_offers
  ADD COLUMN IF NOT EXISTS diy_pool BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS package_stop_offers_diy_pool_idx
  ON public.package_stop_offers (diy_pool, is_active, slot_type)
  WHERE diy_pool = TRUE AND is_active = TRUE;

DROP POLICY IF EXISTS package_stop_offers_select ON public.package_stop_offers;
CREATE POLICY package_stop_offers_select
  ON public.package_stop_offers FOR SELECT
  USING (
    (status = 'approved' AND is_active = TRUE)
    OR (diy_pool = TRUE AND is_active = TRUE)
    OR venue_id IN (SELECT id FROM public.venues WHERE owner_id = auth.uid())
  );

-- Anchor package for DIY / random checkouts (no fixed stops required).
INSERT INTO public.night_packages (
  id,
  slug,
  title,
  subtitle,
  description,
  template_key,
  city,
  status,
  published_at,
  party_size_min,
  party_size_max,
  is_featured,
  sort_order,
  tagline,
  why_this_works
) VALUES (
  'a0000000-0000-4000-8000-0000000000d1',
  'build-your-own',
  'Build Your Own',
  'Mix and match experiences across venues — your night, your way.',
  'Start empty or shuffle a random vibe from live venue experiences. Swap anytime before you pay.',
  'custom',
  'houston',
  'published',
  NOW(),
  1,
  12,
  FALSE,
  999,
  'DIY · random · mix & match',
  'Pick brunch, day, lounge, and night from any venue in the live pool — like booking a flight, hotel, and car for one trip.'
)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  description = EXCLUDED.description,
  status = 'published',
  published_at = COALESCE(public.night_packages.published_at, NOW()),
  updated_at = NOW();
