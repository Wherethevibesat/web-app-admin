import { createAdminClient } from "@/lib/supabase/admin";

export type PromoterLinkSubmission = {
  id: string;
  promoter_id: string;
  venue_id: string;
  status: string;
  requested_at: string;
  promoter?: { name: string; email: string } | null;
  venue?: { name: string } | null;
};

export async function listPendingPromoterLinks(): Promise<PromoterLinkSubmission[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("promoter_venue_links")
    .select(
      "id, promoter_id, venue_id, status, requested_at, promoter:users!promoter_venue_links_promoter_id_fkey(name, email), venue:venues(name)",
    )
    .eq("status", "pending")
    .order("requested_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalize);
}

export async function listAllPromoterLinks(): Promise<PromoterLinkSubmission[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("promoter_venue_links")
    .select(
      "id, promoter_id, venue_id, status, requested_at, promoter:users!promoter_venue_links_promoter_id_fkey(name, email), venue:venues(name)",
    )
    .order("requested_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalize);
}

export async function reviewPromoterLink(
  linkId: string,
  status: "approved" | "rejected",
  adminId: string,
) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("promoter_venue_links")
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
      reviewer_role: "admin",
    })
    .eq("id", linkId);
  if (error) throw error;
}

export async function listPendingPromoterEvents() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("events")
    .select("id, title, venue_id, starts_at, status, promoter_event_approval, venue:venues(name)")
    .not("created_by_promoter_id", "is", null)
    .eq("promoter_event_approval", "pending")
    .order("starts_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export type PromoterUserRow = { id: string; name: string; email: string };

export async function listPromoterUsers(): Promise<PromoterUserRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("id, name, email")
    .eq("role", "promoter")
    .order("name");
  if (error) throw error;
  return (data ?? []) as PromoterUserRow[];
}

export async function findUserByEmail(email: string) {
  const admin = createAdminClient();
  const normalized = email.trim().toLowerCase();
  const { data, error } = await admin
    .from("users")
    .select("id, name, email, role")
    .eq("email", normalized)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function ensurePromoterProfile(
  userId: string,
  name: string,
  email: string,
) {
  const admin = createAdminClient();
  await admin.from("users").update({ role: "promoter", updated_at: new Date().toISOString() }).eq("id", userId);
  await admin.auth.admin.updateUserById(userId, {
    user_metadata: { role: "promoter", name },
  });
  await admin.from("promoter_profiles").upsert(
    {
      user_id: userId,
      display_name: name,
      contact_email: email,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}

export async function ensurePromoterAccount(email: string, name: string): Promise<string> {
  const admin = createAdminClient();
  const normalized = email.trim().toLowerCase();
  const displayName = name.trim() || normalized.split("@")[0] || "Promoter";

  const existing = await findUserByEmail(normalized);
  if (existing) {
    await ensurePromoterProfile(existing.id, displayName, normalized);
    return existing.id;
  }

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: normalized,
    email_confirm: true,
    user_metadata: { role: "promoter", name: displayName },
  });
  if (authError) throw authError;

  const userId = authData.user.id;
  await admin.from("users").upsert(
    {
      id: userId,
      email: normalized,
      name: displayName,
      role: "promoter",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  await admin.from("promoter_profiles").upsert(
    {
      user_id: userId,
      display_name: displayName,
      contact_email: normalized,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  return userId;
}

export async function addPromoterVenueLink(opts: {
  promoterId: string;
  venueId: string;
  reviewerId: string;
  reviewerRole: "admin" | "venueOwner";
  status?: "pending" | "approved";
  notes?: string;
}) {
  const admin = createAdminClient();
  const status = opts.status ?? "approved";
  const now = new Date().toISOString();
  const { error } = await admin.from("promoter_venue_links").upsert(
    {
      promoter_id: opts.promoterId,
      venue_id: opts.venueId,
      status,
      requested_at: now,
      reviewed_at: status === "approved" ? now : null,
      reviewed_by: status === "approved" ? opts.reviewerId : null,
      reviewer_role: status === "approved" ? opts.reviewerRole : null,
      notes: opts.notes ?? "",
    },
    { onConflict: "promoter_id,venue_id" },
  );
  if (error) throw error;
}

export async function getPromoterLinkById(linkId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("promoter_venue_links")
    .select(
      "id, promoter:users!promoter_venue_links_promoter_id_fkey(name, email), venue:venues(name)",
    )
    .eq("id", linkId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const venue = Array.isArray(data.venue) ? data.venue[0] : data.venue;
  const promoter = Array.isArray(data.promoter) ? data.promoter[0] : data.promoter;
  return {
    promoterName: (promoter as { name: string; email: string } | null)?.name ?? "",
    promoterEmail: (promoter as { name: string; email: string } | null)?.email ?? "",
    venueName: (venue as { name: string } | null)?.name ?? "",
  };
}

export async function getPromoterEventForEmail(eventId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("events")
    .select(
      "title, venue:venues(name), promoter:users!events_created_by_promoter_id_fkey(name, email)",
    )
    .eq("id", eventId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const venue = Array.isArray(data.venue) ? data.venue[0] : data.venue;
  const promoter = Array.isArray(data.promoter) ? data.promoter[0] : data.promoter;
  return {
    eventTitle: data.title as string,
    venueName: (venue as { name: string } | null)?.name ?? "",
    promoterName: (promoter as { name: string; email: string } | null)?.name ?? "",
    promoterEmail: (promoter as { name: string; email: string } | null)?.email ?? "",
  };
}

function normalize(row: Record<string, unknown>): PromoterLinkSubmission {
  const promoter = Array.isArray(row.promoter) ? row.promoter[0] : row.promoter;
  const venue = Array.isArray(row.venue) ? row.venue[0] : row.venue;
  return {
    ...(row as unknown as PromoterLinkSubmission),
    promoter: promoter as PromoterLinkSubmission["promoter"],
    venue: venue as PromoterLinkSubmission["venue"],
  };
}
