import { createAdminClient } from "@/lib/supabase/admin";
import type { EventRow } from "@/lib/types/database";
import type { EventFormData } from "@/lib/types/event";

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

export async function upsertEvent(form: EventFormData): Promise<string> {
  const admin = createAdminClient();
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
    updated_at: new Date().toISOString(),
  };

  if (form.id) {
    const { error } = await admin.from("events").update(payload).eq("id", form.id);
    if (error) throw error;
    return form.id;
  }

  const { data, error } = await admin
    .from("events")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function deleteEvent(id: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("events").delete().eq("id", id);
  if (error) throw error;
}

export async function updateEventStatus(
  id: string,
  status: "published" | "cancelled",
) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("events")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
