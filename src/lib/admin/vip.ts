import { createAdminClient } from "@/lib/supabase/admin";
import type { VipPackageRow } from "@/lib/types/database";
import type { VipFormData } from "@/lib/types/vip";

export async function listVipPackages(): Promise<VipPackageRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vip_packages")
    .select("*, venue:venues(name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as VipPackageRow[];
}

export async function getVipPackage(id: string): Promise<VipPackageRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vip_packages")
    .select("*, venue:venues(name)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as VipPackageRow | null;
}

export async function upsertVipPackage(form: VipFormData): Promise<string> {
  const admin = createAdminClient();
  const payload = {
    venue_id: form.venue_id,
    event_id: form.event_id || null,
    package_name: form.package_name,
    description: form.description || "",
    price: form.price,
    benefits: form.benefits.filter(Boolean),
    image_url: form.image_url || null,
    is_active: form.is_active,
    updated_at: new Date().toISOString(),
  };

  if (form.id) {
    const { error } = await admin.from("vip_packages").update(payload).eq("id", form.id);
    if (error) throw error;
    return form.id;
  }

  const { data, error } = await admin
    .from("vip_packages")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function deleteVipPackage(id: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("vip_packages").delete().eq("id", id);
  if (error) throw error;
}
