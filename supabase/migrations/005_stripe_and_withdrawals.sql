-- Stripe admin config + withdrawals (Phase 2)
-- Secret key must live in Supabase Edge Function secrets only.

CREATE TABLE IF NOT EXISTS public.stripe_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  publishable_key TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.stripe_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.stripe_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL UNIQUE,
  account_name TEXT NOT NULL,
  email TEXT,
  last4 TEXT,
  account_type TEXT DEFAULT 'express',
  is_default BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active',
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC(10,2) NOT NULL,
  stripe_transfer_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed')),
  created_by UUID REFERENCES public.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.stripe_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stripe_settings_select" ON public.stripe_settings;
CREATE POLICY "stripe_settings_select" ON public.stripe_settings FOR SELECT USING (true);
