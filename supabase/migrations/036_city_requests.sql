-- City requests & launch-notify signups
-- Run after 035_checkin_qr_token.sql
--
-- Captures interest from the customer app's "Request a city" form and the
-- "Notify me" action on coming-soon city pages. Writes come from server-side
-- API routes using the service role (admin client), which bypasses RLS, so no
-- public insert policy is required. Submissions are kept private.

CREATE TABLE IF NOT EXISTS public.city_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  city TEXT NOT NULL,
  note TEXT,
  source TEXT NOT NULL DEFAULT 'request_form'
    CHECK (source IN ('request_form', 'coming_soon')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS city_requests_city_idx ON public.city_requests (city);
CREATE INDEX IF NOT EXISTS city_requests_created_at_idx ON public.city_requests (created_at DESC);

ALTER TABLE public.city_requests ENABLE ROW LEVEL SECURITY;
-- No public policies: reads/writes happen through the service role only.
