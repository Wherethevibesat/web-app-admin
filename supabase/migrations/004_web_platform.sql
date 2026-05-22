-- WTVA web platform tables (admin portal)
-- Run in Supabase SQL Editor after 000_full_database.sql and 003_business_verification.sql

ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT;

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id TEXT REFERENCES public.venues(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  event_type TEXT NOT NULL DEFAULT 'Party',
  neighborhood TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('draft', 'pending_review', 'published', 'cancelled')),
  featured BOOLEAN DEFAULT false,
  submitted_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vip_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id TEXT NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  package_name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price NUMERIC(10,2) NOT NULL,
  benefits JSONB DEFAULT '[]'::jsonb,
  image_url TEXT,
  promoter_id UUID REFERENCES public.users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  venue_submission_fee NUMERIC(10,2) DEFAULT 50,
  event_submission_fee NUMERIC(10,2) DEFAULT 25,
  auto_approve_venues BOOLEAN DEFAULT false,
  auto_approve_events BOOLEAN DEFAULT false,
  require_payment BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.platform_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.platform_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  type TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_select_published" ON public.events;
CREATE POLICY "events_select_published"
  ON public.events FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "vip_packages_select_active" ON public.vip_packages;
CREATE POLICY "vip_packages_select_active"
  ON public.vip_packages FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "platform_settings_select_all" ON public.platform_settings;
CREATE POLICY "platform_settings_select_all"
  ON public.platform_settings FOR SELECT USING (true);
