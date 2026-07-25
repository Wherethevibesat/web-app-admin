-- Vibe Connect payout tracking + true multi-payer collection groups.

-- ========== ORDER STOP PAYOUT COLUMNS ==========
ALTER TABLE public.night_package_order_stops
  ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT,
  ADD COLUMN IF NOT EXISTS payout_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payout_status IN ('pending', 'transferred', 'failed', 'skipped'));

CREATE INDEX IF NOT EXISTS night_package_order_stops_payout_idx
  ON public.night_package_order_stops (payout_status)
  WHERE payout_status IN ('pending', 'failed');

-- ========== MULTI-PAYER GROUPS ==========
CREATE TABLE IF NOT EXISTS public.vibe_payment_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.night_packages(id) ON DELETE RESTRICT,
  host_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  party_size INTEGER NOT NULL CHECK (party_size >= 1 AND party_size <= 50),
  starts_on DATE NOT NULL,
  stop_offer_ids UUID[] NOT NULL DEFAULT '{}',
  payer_count INTEGER NOT NULL CHECK (payer_count >= 2 AND payer_count <= 20),
  subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents >= 0),
  commission_cents INTEGER NOT NULL CHECK (commission_cents >= 0),
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  status TEXT NOT NULL DEFAULT 'collecting'
    CHECK (status IN ('collecting', 'paid', 'expired', 'cancelled')),
  invite_token TEXT NOT NULL UNIQUE,
  order_id UUID REFERENCES public.night_package_orders(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vibe_payment_groups_host_idx
  ON public.vibe_payment_groups (host_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS vibe_payment_groups_status_idx
  ON public.vibe_payment_groups (status, expires_at);

CREATE TABLE IF NOT EXISTS public.vibe_payment_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.vibe_payment_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  invite_label TEXT,
  role TEXT NOT NULL CHECK (role IN ('host', 'guest')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'refunded')),
  stripe_payment_intent_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS vibe_payment_shares_pi_unique
  ON public.vibe_payment_shares (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS vibe_payment_shares_group_idx
  ON public.vibe_payment_shares (group_id, status);

ALTER TABLE public.vibe_payment_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibe_payment_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vibe_payment_groups_select ON public.vibe_payment_groups;
CREATE POLICY vibe_payment_groups_select
  ON public.vibe_payment_groups FOR SELECT
  TO authenticated
  USING (
    host_user_id = auth.uid()
    OR id IN (
      SELECT group_id FROM public.vibe_payment_shares
      WHERE user_id = auth.uid()
    )
  );

-- Anyone with the invite token can resolve a group for claim UX via service role;
-- authenticated guests who claimed a share can also read via share membership above.

DROP POLICY IF EXISTS vibe_payment_shares_select ON public.vibe_payment_shares;
CREATE POLICY vibe_payment_shares_select
  ON public.vibe_payment_shares FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR group_id IN (
      SELECT id FROM public.vibe_payment_groups WHERE host_user_id = auth.uid()
    )
  );

-- Inserts/updates via service role / SECURITY DEFINER APIs only.
