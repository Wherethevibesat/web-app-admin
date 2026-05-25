-- Marketplace commissions for venue-owned payouts
-- Run after 019_fix_events_promoter_select_rls.sql

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS event_ticket_commission_pct NUMERIC(5,2) NOT NULL DEFAULT 10
    CHECK (event_ticket_commission_pct >= 0 AND event_ticket_commission_pct <= 100),
  ADD COLUMN IF NOT EXISTS vip_commission_pct NUMERIC(5,2) NOT NULL DEFAULT 10
    CHECK (vip_commission_pct >= 0 AND vip_commission_pct <= 100);
