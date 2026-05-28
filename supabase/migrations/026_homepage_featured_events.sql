ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS homepage_featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS featured_ends_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_events_homepage_featured_window
  ON public.events(homepage_featured, featured_starts_at, featured_ends_at);
