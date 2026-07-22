-- Mobile push: device tokens + push channel on message campaigns

CREATE TABLE IF NOT EXISTS public.device_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  app TEXT NOT NULL DEFAULT 'customer'
    CHECK (app IN ('customer', 'business')),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT device_push_tokens_token_unique UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS idx_device_push_tokens_user
  ON public.device_push_tokens(user_id)
  WHERE enabled = TRUE;

CREATE INDEX IF NOT EXISTS idx_device_push_tokens_user_app
  ON public.device_push_tokens(user_id, app)
  WHERE enabled = TRUE;

ALTER TABLE public.device_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "device_push_tokens_select_own" ON public.device_push_tokens;
CREATE POLICY "device_push_tokens_select_own"
  ON public.device_push_tokens FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "device_push_tokens_insert_own" ON public.device_push_tokens;
CREATE POLICY "device_push_tokens_insert_own"
  ON public.device_push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "device_push_tokens_update_own" ON public.device_push_tokens;
CREATE POLICY "device_push_tokens_update_own"
  ON public.device_push_tokens FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "device_push_tokens_delete_own" ON public.device_push_tokens;
CREATE POLICY "device_push_tokens_delete_own"
  ON public.device_push_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Allow push as a campaign / delivery channel
ALTER TABLE public.admin_message_deliveries
  DROP CONSTRAINT IF EXISTS admin_message_deliveries_channel_check;

ALTER TABLE public.admin_message_deliveries
  ADD CONSTRAINT admin_message_deliveries_channel_check
  CHECK (channel IN ('email', 'in_app', 'push'));
