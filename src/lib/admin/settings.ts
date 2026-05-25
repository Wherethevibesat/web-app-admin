import { createAdminClient } from "@/lib/supabase/admin";
import type { PlatformSettings } from "@/lib/types/database";

const DEFAULTS: PlatformSettings = {
  id: 1,
  venue_submission_fee: 50,
  venue_listing_months: 3,
  event_submission_fee: 25,
  event_ticket_commission_pct: 10,
  vip_commission_pct: 10,
  driver_listing_fee: 50,
  driver_listing_months: 3,
  driver_booking_commission_pct: 10,
  auto_approve_venues: false,
  auto_approve_events: false,
  require_payment: true,
  updated_at: new Date().toISOString(),
};

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) return DEFAULTS;
  return {
    id: 1,
    venue_submission_fee: Number(data.venue_submission_fee ?? DEFAULTS.venue_submission_fee),
    venue_listing_months: Number(data.venue_listing_months ?? DEFAULTS.venue_listing_months),
    event_submission_fee: Number(data.event_submission_fee ?? DEFAULTS.event_submission_fee),
    event_ticket_commission_pct: Number(
      data.event_ticket_commission_pct ?? DEFAULTS.event_ticket_commission_pct,
    ),
    vip_commission_pct: Number(data.vip_commission_pct ?? DEFAULTS.vip_commission_pct),
    driver_listing_fee: Number(data.driver_listing_fee ?? DEFAULTS.driver_listing_fee),
    driver_listing_months: Number(data.driver_listing_months ?? DEFAULTS.driver_listing_months),
    driver_booking_commission_pct: Number(
      data.driver_booking_commission_pct ?? DEFAULTS.driver_booking_commission_pct,
    ),
    auto_approve_venues: Boolean(data.auto_approve_venues ?? DEFAULTS.auto_approve_venues),
    auto_approve_events: Boolean(data.auto_approve_events ?? DEFAULTS.auto_approve_events),
    require_payment: Boolean(data.require_payment ?? DEFAULTS.require_payment),
    updated_at: String(data.updated_at ?? DEFAULTS.updated_at),
  };
}

export async function savePlatformSettings(
  settings: Omit<PlatformSettings, "id" | "updated_at">,
) {
  const admin = createAdminClient();
  const { error } = await admin.from("platform_settings").upsert({
    id: 1,
    ...settings,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
