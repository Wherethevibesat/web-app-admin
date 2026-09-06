import { createAdminClient } from "@/lib/supabase/admin";
import type {
  EventGuideFormData,
  EventGuideItemRow,
  EventGuideRow,
} from "@/lib/types/event-guide";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

export async function listEventGuides(): Promise<EventGuideRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("event_guides")
    .select("*, event_guide_items(event_id)")
    .order("starts_on", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => {
    const items = row.event_guide_items as { event_id: string }[] | null;
    const { event_guide_items: _items, ...guide } = row;
    return {
      ...(guide as EventGuideRow),
      item_count: items?.length ?? 0,
    };
  });
}

export async function getEventGuide(id: string): Promise<{
  guide: EventGuideRow;
  items: EventGuideItemRow[];
} | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("event_guides")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { data: items, error: itemsError } = await admin
    .from("event_guide_items")
    .select(
      "guide_id, event_id, sort_order, event:events(id, title, starts_at, ends_at, image_url, ticket_url, status, venue:venues(name))",
    )
    .eq("guide_id", id)
    .order("sort_order", { ascending: true });
  if (itemsError) throw itemsError;

  return {
    guide: data as EventGuideRow,
    items: (items ?? []) as EventGuideItemRow[],
  };
}

export async function upsertEventGuide(form: EventGuideFormData): Promise<string> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const slug = slugify(form.slug || form.title);
  const payload = {
    slug,
    title: form.title.trim(),
    subtitle: form.subtitle.trim(),
    city: form.city.trim() || "houston",
    starts_on: form.starts_on,
    ends_on: form.ends_on,
    cover_image_url: form.cover_image_url.trim() || null,
    posted_by_name: form.posted_by_name.trim() || "WTVA Events",
    published: form.published,
    featured_on_homepage: form.featured_on_homepage,
    updated_at: now,
  };

  let id = form.id;
  if (id) {
    const { error } = await admin.from("event_guides").update(payload).eq("id", id);
    if (error) throw error;
  } else {
    const { data, error } = await admin
      .from("event_guides")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    id = data.id as string;
  }

  const { error: deleteError } = await admin
    .from("event_guide_items")
    .delete()
    .eq("guide_id", id);
  if (deleteError) throw deleteError;

  const eventIds = [...new Set(form.event_ids.filter(Boolean))];
  if (eventIds.length > 0) {
    const { error: insertError } = await admin.from("event_guide_items").insert(
      eventIds.map((eventId, index) => ({
        guide_id: id,
        event_id: eventId,
        sort_order: index,
      })),
    );
    if (insertError) throw insertError;
  }

  return id!;
}

export async function deleteEventGuide(id: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("event_guides").delete().eq("id", id);
  if (error) throw error;
}
