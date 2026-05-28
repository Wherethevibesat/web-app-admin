import { createAdminClient } from "@/lib/supabase/admin";
import { getPlatformSettings } from "@/lib/admin/settings";

export async function activatePaidHomepageFeature(eventId: string, adminId: string) {
  const admin = createAdminClient();
  const settings = await getPlatformSettings();

  const { data: event, error: eventErr } = await admin
    .from("events")
    .select("id, title, status, homepage_featured")
    .eq("id", eventId)
    .maybeSingle();
  if (eventErr) throw eventErr;
  if (!event) throw new Error("Event not found");
  if (event.status !== "published") {
    throw new Error("Only published events can be featured on homepage.");
  }

  const nowIso = new Date().toISOString();
  const { count: activeCount, error: countErr } = await admin
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("homepage_featured", true)
    .or(`featured_starts_at.is.null,featured_starts_at.lte.${nowIso}`)
    .or(`featured_ends_at.is.null,featured_ends_at.gte.${nowIso}`);
  if (countErr) throw countErr;

  if (!event.homepage_featured && (activeCount ?? 0) >= settings.featured_event_max_slots) {
    throw new Error(
      `No featured slots available (${settings.featured_event_max_slots} max active).`,
    );
  }

  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + settings.featured_event_days * 86400000);

  const { error: updateErr } = await admin
    .from("events")
    .update({
      homepage_featured: true,
      featured_starts_at: startsAt.toISOString(),
      featured_ends_at: endsAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId);
  if (updateErr) throw updateErr;

  const { error: txErr } = await admin.from("platform_transactions").insert({
    user_id: null,
    type: "featured_event",
    amount: settings.featured_event_price,
    description: `Homepage featured placement: ${event.title}`,
    status: "completed",
    metadata: {
      event_id: eventId,
      featured_days: settings.featured_event_days,
      activated_by: adminId,
    },
  });
  if (txErr) throw txErr;

  return {
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    amount: settings.featured_event_price,
  };
}

export async function deactivateHomepageFeature(eventId: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("events")
    .update({
      homepage_featured: false,
      featured_starts_at: null,
      featured_ends_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId);
  if (error) throw error;
}
