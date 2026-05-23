import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_CITY, type NeighborhoodFormData, type NeighborhoodRow } from "@/lib/types/neighborhood";
import { slugify } from "@/lib/utils";

export async function listNeighborhoods(city = DEFAULT_CITY): Promise<NeighborhoodRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("neighborhoods")
    .select("*")
    .eq("city", city)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as NeighborhoodRow[];
}

export async function getNeighborhood(id: string): Promise<NeighborhoodRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("neighborhoods")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as NeighborhoodRow | null;
}

export async function upsertNeighborhood(form: NeighborhoodFormData): Promise<string> {
  const admin = createAdminClient();
  const city = form.city.trim() || DEFAULT_CITY;
  const name = form.name.trim();
  const slug = (form.slug?.trim() || slugify(name)).toLowerCase();

  const payload = {
    city,
    name,
    slug,
    description: form.description.trim() || null,
    sort_order: form.sort_order,
    is_active: form.is_active,
    updated_at: new Date().toISOString(),
  };

  if (form.id) {
    const { error } = await admin.from("neighborhoods").update(payload).eq("id", form.id);
    if (error) throw error;
    return form.id;
  }

  const { data, error } = await admin
    .from("neighborhoods")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function deleteNeighborhood(id: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("neighborhoods").delete().eq("id", id);
  if (error) throw error;
}
