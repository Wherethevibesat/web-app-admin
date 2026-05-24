import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { logAdminAction } from "@/lib/admin/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPromoterEventForEmail } from "@/lib/admin/promoters";
import { notifyPromoterEventReview } from "@/lib/email/promoter-notifications";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const { approval, publish } = await request.json();
  if (approval !== "approved" && approval !== "rejected") {
    return NextResponse.json({ error: "approval required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const eventInfo = await getPromoterEventForEmail(id);
  const patch: Record<string, unknown> = {
    promoter_event_approval: approval,
    updated_at: new Date().toISOString(),
  };
  if (approval === "approved" && publish) {
    patch.status = "published";
  } else if (approval === "rejected") {
    patch.status = "cancelled";
  }

  const { error } = await admin.from("events").update(patch).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAdminAction({
    adminId: auth.user!.id,
    action: "promoter_event.review",
    entityType: "event",
    entityId: id,
    payload: { approval, publish },
  });

  if (eventInfo?.promoterEmail) {
    notifyPromoterEventReview({
      promoterEmail: eventInfo.promoterEmail,
      promoterName: eventInfo.promoterName,
      eventTitle: eventInfo.eventTitle,
      venueName: eventInfo.venueName,
      approved: approval === "approved",
    });
  }

  return NextResponse.json({ ok: true });
}
