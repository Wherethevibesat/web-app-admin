-- Public promoter profiles: photo, slug, profile contact inquiries
-- Run after 017_claim_promoter_role.sql

ALTER TABLE public.promoter_profiles
  ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
  ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_promoter_profiles_slug
  ON public.promoter_profiles (lower(slug))
  WHERE slug IS NOT NULL AND slug <> '';

-- ========== PROFILE CONTACT (no offer required) ==========
CREATE TABLE IF NOT EXISTS public.promoter_profile_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT,
  party_size INT CHECK (party_size IS NULL OR party_size >= 1),
  preferred_event TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'reserved', 'booked', 'declined', 'cancelled')),
  promoter_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promoter_profile_inquiries_promoter
  ON public.promoter_profile_inquiries(promoter_id);

ALTER TABLE public.promoter_profile_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promoter_profile_inquiries_select" ON public.promoter_profile_inquiries;
CREATE POLICY "promoter_profile_inquiries_select"
  ON public.promoter_profile_inquiries FOR SELECT
  USING (
    promoter_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

DROP POLICY IF EXISTS "promoter_profile_inquiries_update_promoter" ON public.promoter_profile_inquiries;
CREATE POLICY "promoter_profile_inquiries_update_promoter"
  ON public.promoter_profile_inquiries FOR UPDATE
  USING (promoter_id = auth.uid());

-- ========== STORAGE: promoter profile photos ==========
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'promoter-images',
  'promoter-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "promoter_images_public_read" ON storage.objects;
CREATE POLICY "promoter_images_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'promoter-images');

DROP POLICY IF EXISTS "promoter_images_owner_insert" ON storage.objects;
CREATE POLICY "promoter_images_owner_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'promoter-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "promoter_images_owner_update" ON storage.objects;
CREATE POLICY "promoter_images_owner_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'promoter-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "promoter_images_owner_delete" ON storage.objects;
CREATE POLICY "promoter_images_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'promoter-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
