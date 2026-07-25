import { createAdminClient } from "@/lib/supabase/admin";
import type {
  NightPackageFormData,
  NightPackageRow,
  PackageStopOfferRow,
} from "@/lib/types/night-package";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function listApprovedStopOffers(): Promise<PackageStopOfferRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("package_stop_offers")
    .select("*, venue:venues(id, name)")
    .eq("status", "approved")
    .eq("is_active", true)
    .order("slot_type")
    .order("title");
  if (error) throw error;
  return (data ?? []) as PackageStopOfferRow[];
}

export async function listPendingStopOffers(): Promise<PackageStopOfferRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("package_stop_offers")
    .select("*, venue:venues(id, name)")
    .eq("status", "pending_review")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PackageStopOfferRow[];
}

export async function setStopOfferStatus(
  id: string,
  status: "approved" | "rejected" | "archived",
) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("package_stop_offers")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function listNightPackages(): Promise<NightPackageRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("night_packages")
    .select("*, stops:night_package_stops(id, sort_order, stop_offer_id)")
    .order("sort_order")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as NightPackageRow[];
}

export async function getNightPackage(id: string): Promise<NightPackageRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("night_packages")
    .select(
      `*, stops:night_package_stops(
        id, sort_order, scheduled_label, notes, stop_offer_id,
        stop_offer:package_stop_offers(*, venue:venues(id, name))
      )`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const stops = ((data.stops as NightPackageRow["stops"]) ?? []).slice().sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  const subtotal = stops.reduce(
    (sum, s) => sum + (s.stop_offer?.price_cents ?? 0),
    0,
  );
  return { ...data, stops, subtotal_cents: subtotal } as NightPackageRow;
}

export async function upsertNightPackage(form: NightPackageFormData): Promise<string> {
  const admin = createAdminClient();
  const splitList = (raw: string) =>
    raw
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);

  const diyDollars = Number(form.diy_compare_dollars);
  const rating = Number(form.rating);
  const groups = Number(form.groups_booked);
  const energy = Number(form.energy_score);
  const travel = Number(form.travel_minutes);

  const payload = {
    title: form.title.trim(),
    subtitle: form.subtitle.trim(),
    description: form.description.trim(),
    tagline: form.tagline.trim(),
    why_this_works: form.why_this_works.trim(),
    perfect_for: splitList(form.perfect_for),
    not_ideal_for: splitList(form.not_ideal_for),
    diy_compare_cents:
      Number.isFinite(diyDollars) && diyDollars > 0
        ? Math.round(diyDollars * 100)
        : null,
    rating: Number.isFinite(rating) && rating > 0 ? rating : null,
    groups_booked: Number.isFinite(groups) && groups > 0 ? Math.round(groups) : null,
    vibe_tags: splitList(form.vibe_tags),
    energy_score: Number.isFinite(energy) && energy > 0 ? energy : null,
    travel_minutes: Number.isFinite(travel) && travel > 0 ? Math.round(travel) : null,
    crowd_label: form.crowd_label.trim() || null,
    music_tags: splitList(form.music_tags),
    template_key: form.template_key || "custom",
    city: form.city.trim() || "houston",
    image_url: form.image_url.trim() || null,
    status: form.status,
    starts_on: form.starts_on || null,
    party_size_min: form.party_size_min,
    party_size_max: form.party_size_max,
    sort_order: form.sort_order,
    is_featured: form.is_featured,
    slug: slugify(form.title),
    updated_at: new Date().toISOString(),
    published_at: form.status === "published" ? new Date().toISOString() : null,
  };

  let packageId = form.id;
  if (packageId) {
    const { error } = await admin.from("night_packages").update(payload).eq("id", packageId);
    if (error) throw error;
  } else {
    const { data, error } = await admin
      .from("night_packages")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;
    packageId = data.id as string;
  }

  await admin.from("night_package_stops").delete().eq("package_id", packageId);
  const stopRows = form.stop_offer_ids
    .map((stopOfferId, index) => ({
      package_id: packageId!,
      stop_offer_id: stopOfferId,
      sort_order: index,
      scheduled_label: form.scheduled_labels[index]?.trim() || null,
    }))
    .filter((r) => r.stop_offer_id);

  if (stopRows.length) {
    const { error } = await admin.from("night_package_stops").insert(stopRows);
    if (error) throw error;
  }

  return packageId!;
}

export async function deleteNightPackage(id: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("night_packages").delete().eq("id", id);
  if (error) throw error;
}
