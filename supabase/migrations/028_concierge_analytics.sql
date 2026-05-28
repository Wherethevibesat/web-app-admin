CREATE TABLE IF NOT EXISTS public.concierge_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('query', 'click')),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  session_id TEXT,
  query TEXT,
  recommendation_kind TEXT,
  recommendation_id TEXT,
  recommendation_title TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_concierge_events_type_created
  ON public.concierge_events(event_type, created_at DESC);
