import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const patch = await request.json();

  try {
    const admin = createAdminClient();

    const { data: before } = await admin
      .from("driver_companies")
      .select("company_name, published, status, contact_email, owner:users!driver_companies_owner_id_fkey(name, email)")
      .eq("id", id)
      .maybeSingle();

    const { error } = await admin
      .from("driver_companies")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;

    if (before) {
      const owner = Array.isArray(before.owner) ? before.owner[0] : before.owner;
      const ownerEmail =
        (owner as { email: string } | null)?.email ?? (before.contact_email as string | null);
      const ownerName = (owner as { name: string } | null)?.name ?? "";
      const companyName = before.company_name as string;
      const wasPublished = Boolean(before.published);
      const nowPublished = patch.published !== undefined ? Boolean(patch.published) : wasPublished;

      if (ownerEmail && !wasPublished && nowPublished) {
        const { notifyDriverListingPublished } = await import("@/lib/email/driver-notifications");
        notifyDriverListingPublished({ ownerEmail, ownerName, companyName });
      } else if (ownerEmail && wasPublished && !nowPublished) {
        const { notifyDriverListingDeactivated } = await import("@/lib/email/driver-notifications");
        notifyDriverListingDeactivated({ ownerEmail, ownerName, companyName });
      }
    }

    await logAdminAction({
      adminId: auth.user!.id,
      action: "driver.patch",
      entityType: "driver_company",
      entityId: id,
      payload: patch,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
