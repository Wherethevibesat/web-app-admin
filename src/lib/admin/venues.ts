import { createAdminClient } from "@/lib/supabase/admin";
import type { VenueFormData, VenueRow } from "@/lib/types/venue";

export async function listVenues(search?: string): Promise<VenueRow[]> {
  const admin = createAdminClient();
  let query = admin.from("venues").select("*").order("name");

  const { data, error } = await query;
  if (error) throw error;

  let rows = (data ?? []) as VenueRow[];
  if (search?.trim()) {
    const q = search.toLowerCase();
    rows = rows.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        (v.neighborhood ?? "").toLowerCase().includes(q) ||
        (v.address ?? "").toLowerCase().includes(q),
    );
  }
  return rows;
}

export async function getVenue(id: string): Promise<VenueRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("venues").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as VenueRow | null;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export async function upsertVenue(
  form: VenueFormData,
  existingId?: string,
): Promise<string> {
  const admin = createAdminClient();
  const id = existingId ?? form.id ?? slugify(form.name);

  const payload = {
    id,
    name: form.name,
    venue_type: form.venue_type,
    address: form.address || null,
    neighborhood: form.neighborhood || null,
    description: form.description || null,
    image_url: form.image_url || null,
    phone: form.phone || null,
    hours_label: form.hours_label || "Open until 2:00 AM",
    subscription_tier: form.subscription_tier,
    verified: form.verified,
    featured: form.featured,
    published: form.published,
    is_open: form.is_open,
    latitude: form.latitude ? parseFloat(form.latitude) : null,
    longitude: form.longitude ? parseFloat(form.longitude) : null,
    owner_id: form.owner_id || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin.from("venues").upsert(payload, {
    onConflict: "id",
  });
  if (error) throw error;
  return id;
}

export async function deleteVenue(id: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("venues").delete().eq("id", id);
  if (error) throw error;
}

export async function listPendingVerification(): Promise<VenueRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("venues")
    .select("*")
    .eq("verification_status", "pending")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as VenueRow[];
}

export async function setVerificationStatus(
  venueId: string,
  status: "approved" | "rejected",
) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("venues")
    .update({
      verification_status: status,
      verified: status === "approved",
      updated_at: new Date().toISOString(),
    })
    .eq("id", venueId);
  if (error) throw error;
}

export async function listUnpublishedVenues(): Promise<VenueRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("venues")
    .select("*")
    .eq("published", false)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as VenueRow[];
}
