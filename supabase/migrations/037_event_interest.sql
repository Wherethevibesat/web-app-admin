-- Event interest / tip-a-night / notify-me signups
-- Run after 036_city_requests.sql
--
-- Captures demand when event pages are thin (no tickets), when the homepage
-- feed is empty, or when someone tips a future night. Writes come from
-- server-side API routes using the service role (admin client), which bypasses
-- RLS, so no public insert policy is required. Submissions are kept private.

CREATE TABLE IF NOT EXISTS public.event_interest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  city TEXT,
  neighborhood TEXT,
  vibe TEXT,
  note TEXT,
  source TEXT NOT NULL DEFAULT 'tip_a_night'
    CHECK (source IN ('notify_me', 'tip_a_night', 'empty_feed')),
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS event_interest_created_at_idx
  ON public.event_interest (created_at DESC);
CREATE INDEX IF NOT EXISTS event_interest_source_idx
  ON public.event_interest (source);
CREATE INDEX IF NOT EXISTS event_interest_event_id_idx
  ON public.event_interest (event_id);

ALTER TABLE public.event_interest ENABLE ROW LEVEL SECURITY;
-- No public policies: reads/writes happen through the service role only.
