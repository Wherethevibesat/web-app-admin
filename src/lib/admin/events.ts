import { createAdminClient } from "@/lib/supabase/admin";
import { buildEventOccurrences } from "@/lib/event-occurrences";
import { FREE_RSVP_TIER_NAME, normalizeTicketTiers } from "@/lib/types/ticket";
import type { EventRow } from "@/lib/types/database";
import type { EventFormData } from "@/lib/types/event";
import type { TicketTierInput } from "@/lib/types/ticket";

async function saveTicketTiers(eventIds: string[], tiers: ReturnType<typeof normalizeTicketTiers>) {
  if (eventIds.length === 0) return;
  const admin = createAdminClient();
  const rows = eventIds.flatMap((eventId) =>
    tiers.map((tier, index) => ({
      event_id: eventId,
      name: tier.name || (index === 0 ? FREE_RSVP_TIER_NAME : "Ticket"),
      description: tier.description?.trim() || "",
      price_cents: tier.price_cents,
      capacity: tier.capacity ?? null,
      sort_order: index,
      is_active: true,
      updated_at: new Date().toISOString(),
    })),
  );
  const { error } = await admin.from("event_ticket_tiers").insert(rows);
  if (error) throw error;
}

export async function listEvents(): Promise<EventRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("events")
    .select("*, venue:venues(name)")
    .order("starts_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as EventRow[];
}

export async function listPendingEvents(): Promise<EventRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("events")
    .select("*, venue:venues(name)")
    .eq("status", "pending_review")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as EventRow[];
}

export async function getEvent(id: string): Promise<EventRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("events")
    .select("*, venue:venues(name)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as EventRow | null;
}

export async function getEventTicketTiers(eventId: string): Promise<TicketTierInput[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("event_ticket_tiers")
    .select("name, description, price_cents, capacity, sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((tier) => ({
    name: tier.name as string,
    description: (tier.description as string | null) ?? "",
    price_cents: tier.price_cents as number,
    capacity: tier.capacity as number | null,
  }));
}

export async function upsertEvent(form: EventFormData): Promise<string> {
  const admin = createAdminClient();
  const tiers = normalizeTicketTiers(form.ticket_tiers ?? []);
  const now = new Date().toISOString();

  if (form.id) {
    const payload = {
      venue_id: form.venue_id || null,
      title: form.title,
      description: form.description || "",
      event_type: form.event_type,
      neighborhood: form.neighborhood || null,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      image_url: form.image_url || null,
      status: form.status,
      featured: form.featured,
      updated_at: now,
    };
    const { error } = await admin.from("events").update(payload).eq("id", form.id);
    if (error) throw error;
    await admin.from("event_ticket_tiers").delete().eq("event_id", form.id);
    await saveTicketTiers([form.id], tiers);
    return form.id;
  }

  const occurrences = buildEventOccurrences({
    starts_at: form.starts_at,
    ends_at: form.ends_at,
    additional_dates: form.additional_dates ?? [],
    recurrence: form.recurrence,
  });

  const { data: series, error: seriesError } = await admin
    .from("event_series")
    .insert({
      venue_id: form.venue_id || null,
      title: form.title,
      description: form.description || "",
      event_type: form.event_type,
      neighborhood: form.neighborhood || null,
      image_url: form.image_url || null,
      status: form.status,
      updated_at: now,
    })
    .select("id")
    .single();
  if (seriesError) throw seriesError;

  if (form.recurrence?.enabled && form.recurrence.by_weekday.length > 0 && form.recurrence.until_date) {
    await admin.from("event_recurrence_rules").insert({
      series_id: series.id,
      freq: "weekly",
      interval_weeks: form.recurrence.interval_weeks ?? 1,
      by_weekday: form.recurrence.by_weekday,
      until_date: form.recurrence.until_date,
    });
  }

  const rows = occurrences.map(({ starts, ends }, index) => ({
    venue_id: form.venue_id || null,
    series_id: series.id,
    occurrence_index: index,
    title: form.title,
    description: form.description || "",
    event_type: form.event_type,
    neighborhood: form.neighborhood || null,
    starts_at: starts.toISOString(),
    ends_at: ends?.toISOString() ?? null,
    image_url: form.image_url || null,
    status: form.status,
    featured: form.featured,
    updated_at: now,
  }));

  const { data, error } = await admin.from("events").insert(rows).select("id");
  if (error) throw error;
  const ids = (data ?? []).map((row) => row.id as string);
  await saveTicketTiers(ids, tiers);
  return ids[0]!;
}

export async function deleteEvent(id: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("events").delete().eq("id", id);
  if (error) throw error;
}

export type EventReviewStatus = "published" | "cancelled" | "draft";

export async function reviewEvent(id: string, status: EventReviewStatus) {
  const admin = createAdminClient();
  const { data: event, error: fetchError } = await admin
    .from("events")
    .select("id, status, series_id")
    .eq("id", id)
    .single();
  if (fetchError) throw fetchError;
  if (event.status !== "pending_review") {
    throw new Error("Only pending_review events can be reviewed.");
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from("events")
    .update({ status, updated_at: now })
    .eq("id", id);
  if (error) throw error;

  if (event.series_id) {
    try {
      await admin
        .from("event_series")
        .update({ status, updated_at: now })
        .eq("id", event.series_id);
      await admin
        .from("events")
        .update({ status, updated_at: now })
        .eq("series_id", event.series_id);
    } catch {
      // Series tables may be unavailable on older schemas.
    }
  }
}

export async function reviewEventsBulk(ids: string[], status: EventReviewStatus) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  const succeeded: string[] = [];
  const failed: { id: string; error: string }[] = [];

  for (const id of uniqueIds) {
    try {
      await reviewEvent(id, status);
      succeeded.push(id);
    } catch (err) {
      failed.push({
        id,
        error: err instanceof Error ? err.message : "Review failed",
      });
    }
  }

  return { succeeded, failed };
}

/** @deprecated Use reviewEvent */
export async function updateEventStatus(id: string, status: "published" | "cancelled") {
  await reviewEvent(id, status);
}
