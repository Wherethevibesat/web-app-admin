-- Admin message center: broadcast campaigns + in-app notifications + support threads

ALTER TABLE public.chat_threads DROP CONSTRAINT IF EXISTS chat_threads_kind_check;
ALTER TABLE public.chat_threads
  ADD CONSTRAINT chat_threads_kind_check
  CHECK (kind IN ('dm', 'venue', 'support'));

CREATE TABLE IF NOT EXISTS public.admin_message_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  audience TEXT NOT NULL
    CHECK (audience IN ('customer', 'driver', 'venueOwner', 'promoter')),
  channels TEXT[] NOT NULL DEFAULT ARRAY['email', 'in_app']::TEXT[],
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sending', 'sent', 'failed')),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  recipient_count INT NOT NULL DEFAULT 0,
  sent_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.admin_message_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.admin_message_campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'in_app')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'read')),
  error TEXT,
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_message_deliveries_campaign
  ON public.admin_message_deliveries(campaign_id);

CREATE INDEX IF NOT EXISTS idx_admin_message_deliveries_user
  ON public.admin_message_deliveries(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  campaign_id UUID REFERENCES public.admin_message_campaigns(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user
  ON public.user_notifications(user_id, created_at DESC);

ALTER TABLE public.admin_message_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_message_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_notifications_select_own" ON public.user_notifications;
CREATE POLICY "user_notifications_select_own"
  ON public.user_notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_notifications_update_own" ON public.user_notifications;
CREATE POLICY "user_notifications_update_own"
  ON public.user_notifications FOR UPDATE
  USING (auth.uid() = user_id);
