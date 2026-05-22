import { createAdminClient } from "@/lib/supabase/admin";
import type { PlatformSettings } from "@/lib/types/database";

const DEFAULTS: PlatformSettings = {
  id: 1,
  venue_submission_fee: 50,
  event_submission_fee: 25,
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
  return data as PlatformSettings;
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
