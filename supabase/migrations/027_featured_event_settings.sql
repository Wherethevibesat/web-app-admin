ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS featured_event_price NUMERIC(10,2) NOT NULL DEFAULT 75,
  ADD COLUMN IF NOT EXISTS featured_event_days INT NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS featured_event_max_slots INT NOT NULL DEFAULT 6;
