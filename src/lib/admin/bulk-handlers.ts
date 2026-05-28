import { runBulk } from "@/lib/admin/bulk-result";
import { deleteVenue, setVerificationStatus } from "@/lib/admin/venues";
import { setDriverCompanyPublished } from "@/lib/admin/drivers";
import { reviewPromoterLink } from "@/lib/admin/promoters";
import { reviewEventsBulk, type EventReviewStatus } from "@/lib/admin/events";
import { deleteUser } from "@/lib/admin/users";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/types/database";

export async function bulkPatchVenues(
  ids: string[],
  patch: Record<string, unknown>,
) {
  const admin = createAdminClient();
  return runBulk(ids, async (id) => {
    const { error } = await admin
      .from("venues")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  });
}

export async function bulkDeleteVenues(ids: string[]) {
  return runBulk(ids, deleteVenue);
}

export async function bulkVerifyVenues(
  ids: string[],
  status: "approved" | "rejected",
) {
  return runBulk(ids, (id) => setVerificationStatus(id, status));
}

export async function bulkPatchDrivers(
  ids: string[],
  published: boolean,
) {
  return runBulk(ids, (id) => setDriverCompanyPublished(id, published));
}

export async function bulkReviewPromoterLinks(
  ids: string[],
  status: "approved" | "rejected",
  adminId: string,
) {
  return runBulk(ids, (id) => reviewPromoterLink(id, status, adminId));
}

export async function bulkReviewEvents(ids: string[], status: EventReviewStatus) {
  return reviewEventsBulk(ids, status);
}

export async function bulkDeleteEvents(ids: string[]) {
  const admin = createAdminClient();
  return runBulk(ids, async (id) => {
    const { error } = await admin.from("events").delete().eq("id", id);
    if (error) throw error;
  });
}

export async function bulkDeleteUsers(ids: string[]) {
  const admin = createAdminClient();
  return runBulk(ids, async (id) => {
    const { data } = await admin.from("users").select("role").eq("id", id).maybeSingle();
    if (data?.role === "admin") {
      throw new Error("Cannot delete admin accounts in bulk");
    }
    await deleteUser(id);
  });
}

export async function bulkSetUserRole(ids: string[], role: UserRole) {
  const admin = createAdminClient();
  return runBulk(ids, async (id) => {
    const { error } = await admin
      .from("users")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  });
}

export async function bulkPatchNeighborhoods(
  ids: string[],
  patch: Record<string, unknown>,
) {
  const admin = createAdminClient();
  return runBulk(ids, async (id) => {
    const { error } = await admin
      .from("neighborhoods")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  });
}

export async function bulkDeleteNeighborhoods(ids: string[]) {
  const admin = createAdminClient();
  return runBulk(ids, async (id) => {
    const { error } = await admin.from("neighborhoods").delete().eq("id", id);
    if (error) throw error;
  });
}

export async function bulkPatchVipPackages(
  ids: string[],
  patch: Record<string, unknown>,
) {
  const admin = createAdminClient();
  return runBulk(ids, async (id) => {
    const { error } = await admin
      .from("vip_packages")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  });
}

export async function bulkDeleteVipPackages(ids: string[]) {
  const admin = createAdminClient();
  return runBulk(ids, async (id) => {
    const { error } = await admin.from("vip_packages").delete().eq("id", id);
    if (error) throw error;
  });
}

export async function bulkReviewPromoterEvents(
  ids: string[],
  approval: "approved" | "rejected",
  publishApproved = true,
) {
  const admin = createAdminClient();
  return runBulk(ids, async (id) => {
    const patch: Record<string, unknown> = {
      promoter_event_approval: approval,
      updated_at: new Date().toISOString(),
    };
    if (approval === "approved" && publishApproved) {
      patch.status = "published";
    } else if (approval === "rejected") {
      patch.status = "cancelled";
    }
    const { error } = await admin.from("events").update(patch).eq("id", id);
    if (error) throw error;
  });
}
