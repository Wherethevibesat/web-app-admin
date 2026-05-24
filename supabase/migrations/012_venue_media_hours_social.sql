-- Venue cover images, structured hours, and social / website links

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_url TEXT,
  ADD COLUMN IF NOT EXISTS twitter_url TEXT,
  ADD COLUMN IF NOT EXISTS opening_hours JSONB;

COMMENT ON COLUMN public.venues.opening_hours IS
  'Weekly schedule: { "monday": { "closed": false, "open": "21:00", "close": "02:00" }, ... }';

-- Public bucket for venue cover photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'venue-images',
  'venue-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "venue_images_public_read" ON storage.objects;
CREATE POLICY "venue_images_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'venue-images');

DROP POLICY IF EXISTS "venue_images_owner_insert" ON storage.objects;
CREATE POLICY "venue_images_owner_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'venue-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "venue_images_owner_update" ON storage.objects;
CREATE POLICY "venue_images_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'venue-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "venue_images_owner_delete" ON storage.objects;
CREATE POLICY "venue_images_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'venue-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
