-- Driver / limo companies, fleet, packages, and customer bookings
-- Run after 012_venue_media_hours_social.sql

-- ========== ROLES ==========
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'venueOwner', 'customer', 'driver'));

-- ========== PLATFORM SETTINGS ==========
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS driver_listing_fee NUMERIC(10,2) NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS driver_listing_months INT NOT NULL DEFAULT 3
    CHECK (driver_listing_months >= 1),
  ADD COLUMN IF NOT EXISTS driver_booking_commission_pct NUMERIC(5,2) NOT NULL DEFAULT 10
    CHECK (driver_booking_commission_pct >= 0 AND driver_booking_commission_pct <= 100);

-- ========== DRIVER COMPANIES ==========
CREATE TABLE IF NOT EXISTS public.driver_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  description TEXT DEFAULT '',
  contact_phone TEXT,
  contact_email TEXT,
  city TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_review', 'published', 'suspended', 'cancelled')),
  published BOOLEAN NOT NULL DEFAULT false,
  listing_paid_at TIMESTAMPTZ,
  listing_expires_at TIMESTAMPTZ,
  listing_payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_companies_owner ON public.driver_companies(owner_id);
CREATE INDEX IF NOT EXISTS idx_driver_companies_status ON public.driver_companies(status);
CREATE INDEX IF NOT EXISTS idx_driver_companies_listing_expires ON public.driver_companies(listing_expires_at);

-- ========== FLEET ==========
CREATE TABLE IF NOT EXISTS public.driver_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.driver_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  capacity INT CHECK (capacity IS NULL OR capacity >= 1),
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_vehicles_company ON public.driver_vehicles(company_id);

-- Packages: e.g. 2 hours @ $300 (driver-defined duration + price)
CREATE TABLE IF NOT EXISTS public.driver_vehicle_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.driver_vehicles(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT '',
  duration_hours NUMERIC(6,2) NOT NULL CHECK (duration_hours > 0),
  price_cents INT NOT NULL CHECK (price_cents >= 0),
  description TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_packages_vehicle ON public.driver_vehicle_packages(vehicle_id);

-- ========== BOOKINGS (driver must accept) ==========
CREATE TABLE IF NOT EXISTS public.driver_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.driver_companies(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.driver_vehicles(id) ON DELETE RESTRICT,
  package_id UUID NOT NULL REFERENCES public.driver_vehicle_packages(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pickup_address TEXT NOT NULL,
  dropoff_address TEXT,
  scheduled_starts_at TIMESTAMPTZ NOT NULL,
  duration_hours NUMERIC(6,2) NOT NULL CHECK (duration_hours > 0),
  price_cents INT NOT NULL CHECK (price_cents >= 0),
  platform_fee_cents INT NOT NULL DEFAULT 0 CHECK (platform_fee_cents >= 0),
  driver_payout_cents INT NOT NULL DEFAULT 0 CHECK (driver_payout_cents >= 0),
  status TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN (
      'pending_payment',
      'pending_driver',
      'accepted',
      'declined',
      'cancelled',
      'completed'
    )),
  customer_notes TEXT DEFAULT '',
  driver_notes TEXT DEFAULT '',
  stripe_payment_intent_id TEXT,
  accepted_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_bookings_company ON public.driver_bookings(company_id);
CREATE INDEX IF NOT EXISTS idx_driver_bookings_customer ON public.driver_bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_driver_bookings_status ON public.driver_bookings(status);
CREATE INDEX IF NOT EXISTS idx_driver_bookings_scheduled ON public.driver_bookings(scheduled_starts_at);

-- ========== STORAGE ==========
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'driver-vehicle-images',
  'driver-vehicle-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ========== RLS ==========
ALTER TABLE public.driver_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_vehicle_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_bookings ENABLE ROW LEVEL SECURITY;

-- Companies: public sees published + listing not expired; owners manage own
DROP POLICY IF EXISTS "driver_companies_select" ON public.driver_companies;
CREATE POLICY "driver_companies_select"
  ON public.driver_companies FOR SELECT
  USING (
    (published = true AND status = 'published'
      AND (listing_expires_at IS NULL OR listing_expires_at > NOW()))
    OR owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

DROP POLICY IF EXISTS "driver_companies_insert_owner" ON public.driver_companies;
CREATE POLICY "driver_companies_insert_owner"
  ON public.driver_companies FOR INSERT
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "driver_companies_update_owner" ON public.driver_companies;
CREATE POLICY "driver_companies_update_owner"
  ON public.driver_companies FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Vehicles & packages: follow company ownership
DROP POLICY IF EXISTS "driver_vehicles_select" ON public.driver_vehicles;
CREATE POLICY "driver_vehicles_select"
  ON public.driver_vehicles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.driver_companies c
      WHERE c.id = driver_vehicles.company_id
        AND (
          (c.published = true AND c.status = 'published'
            AND (c.listing_expires_at IS NULL OR c.listing_expires_at > NOW()))
          OR c.owner_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "driver_vehicles_mutate_owner" ON public.driver_vehicles;
CREATE POLICY "driver_vehicles_mutate_owner"
  ON public.driver_vehicles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.driver_companies c
      WHERE c.id = driver_vehicles.company_id AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.driver_companies c
      WHERE c.id = driver_vehicles.company_id AND c.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "driver_packages_select" ON public.driver_vehicle_packages;
CREATE POLICY "driver_packages_select"
  ON public.driver_vehicle_packages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.driver_vehicles v
      JOIN public.driver_companies c ON c.id = v.company_id
      WHERE v.id = driver_vehicle_packages.vehicle_id
        AND (
          (c.published = true AND c.status = 'published'
            AND (c.listing_expires_at IS NULL OR c.listing_expires_at > NOW()))
          OR c.owner_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "driver_packages_mutate_owner" ON public.driver_vehicle_packages;
CREATE POLICY "driver_packages_mutate_owner"
  ON public.driver_vehicle_packages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.driver_vehicles v
      JOIN public.driver_companies c ON c.id = v.company_id
      WHERE v.id = driver_vehicle_packages.vehicle_id AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.driver_vehicles v
      JOIN public.driver_companies c ON c.id = v.company_id
      WHERE v.id = driver_vehicle_packages.vehicle_id AND c.owner_id = auth.uid()
    )
  );

-- Bookings
DROP POLICY IF EXISTS "driver_bookings_select" ON public.driver_bookings;
CREATE POLICY "driver_bookings_select"
  ON public.driver_bookings FOR SELECT
  USING (
    customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.driver_companies c
      WHERE c.id = driver_bookings.company_id AND c.owner_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

DROP POLICY IF EXISTS "driver_bookings_insert_customer" ON public.driver_bookings;
CREATE POLICY "driver_bookings_insert_customer"
  ON public.driver_bookings FOR INSERT
  WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "driver_bookings_update_parties" ON public.driver_bookings;
CREATE POLICY "driver_bookings_update_parties"
  ON public.driver_bookings FOR UPDATE
  USING (
    customer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.driver_companies c
      WHERE c.id = driver_bookings.company_id AND c.owner_id = auth.uid()
    )
  );

-- Storage: public read; drivers upload under company folder
DROP POLICY IF EXISTS "driver_images_public_read" ON storage.objects;
CREATE POLICY "driver_images_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'driver-vehicle-images');

DROP POLICY IF EXISTS "driver_images_owner_insert" ON storage.objects;
CREATE POLICY "driver_images_owner_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'driver-vehicle-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "driver_images_owner_update" ON storage.objects;
CREATE POLICY "driver_images_owner_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'driver-vehicle-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "driver_images_owner_delete" ON storage.objects;
CREATE POLICY "driver_images_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'driver-vehicle-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
