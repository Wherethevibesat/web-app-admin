import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { logAdminAction } from "@/lib/admin/audit";
import { reviewPromoterLink, getPromoterLinkById } from "@/lib/admin/promoters";
import { notifyPromoterVenueLink } from "@/lib/email/promoter-notifications";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const { status } = await request.json();
  if (status !== "approved" && status !== "rejected") {
    return NextResponse.json({ error: "status must be approved or rejected" }, { status: 400 });
  }

  try {
    const link = await getPromoterLinkById(id);
    await reviewPromoterLink(id, status, auth.user!.id);
    await logAdminAction({
      adminId: auth.user!.id,
      action: "promoter_link.review",
      entityType: "promoter_venue_link",
      entityId: id,
      payload: { status },
    });
    if (link?.promoterEmail) {
      notifyPromoterVenueLink({
        promoterEmail: link.promoterEmail,
        promoterName: link.promoterName,
        venueName: link.venueName,
        approved: status === "approved",
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
