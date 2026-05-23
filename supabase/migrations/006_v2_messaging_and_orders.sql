-- WTVA v2: messaging + VIP purchase records
-- Run after 005_stripe_and_withdrawals.sql

CREATE TABLE IF NOT EXISTS public.chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL DEFAULT 'dm' CHECK (kind IN ('dm', 'venue')),
  venue_id TEXT REFERENCES public.venues(id) ON DELETE SET NULL,
  title TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_participants (
  thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON public.chat_messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_threads_last ON public.chat_threads(last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.vip_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  vip_package_id UUID NOT NULL REFERENCES public.vip_packages(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_orders ENABLE ROW LEVEL SECURITY;

-- Participants can see their threads
DROP POLICY IF EXISTS "chat_participants_select_own" ON public.chat_participants;
CREATE POLICY "chat_participants_select_own"
  ON public.chat_participants FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "chat_threads_select_participant" ON public.chat_threads;
CREATE POLICY "chat_threads_select_participant"
  ON public.chat_threads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants p
      WHERE p.thread_id = chat_threads.id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "chat_messages_select_participant" ON public.chat_messages;
CREATE POLICY "chat_messages_select_participant"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_participants p
      WHERE p.thread_id = chat_messages.thread_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "chat_messages_insert_participant" ON public.chat_messages;
CREATE POLICY "chat_messages_insert_participant"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.chat_participants p
      WHERE p.thread_id = chat_messages.thread_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "vip_orders_select_own" ON public.vip_orders;
CREATE POLICY "vip_orders_select_own"
  ON public.vip_orders FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "vip_orders_insert_own" ON public.vip_orders;
CREATE POLICY "vip_orders_insert_own"
  ON public.vip_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);
