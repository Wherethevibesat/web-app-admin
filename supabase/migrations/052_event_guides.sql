-- Curated weekend / holiday guides (e.g. Labor Day Weekend) plus RSVP links on events.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS ticket_url TEXT;

CREATE TABLE IF NOT EXISTS public.event_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT DEFAULT '',
  city TEXT NOT NULL DEFAULT 'houston',
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  cover_image_url TEXT,
  posted_by_name TEXT NOT NULL DEFAULT 'WTVA Events',
  published BOOLEAN NOT NULL DEFAULT false,
  featured_on_homepage BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.event_guide_items (
  guide_id UUID NOT NULL REFERENCES public.event_guides(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (guide_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_event_guides_homepage
  ON public.event_guides(featured_on_homepage, published, ends_on);

CREATE INDEX IF NOT EXISTS idx_event_guide_items_sort
  ON public.event_guide_items(guide_id, sort_order);

ALTER TABLE public.event_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_guide_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_guides_select_published ON public.event_guides;
CREATE POLICY event_guides_select_published
  ON public.event_guides FOR SELECT
  USING (published = true);

DROP POLICY IF EXISTS event_guide_items_select_published ON public.event_guide_items;
CREATE POLICY event_guide_items_select_published
  ON public.event_guide_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.event_guides g
      WHERE g.id = event_guide_items.guide_id AND g.published = true
    )
  );
