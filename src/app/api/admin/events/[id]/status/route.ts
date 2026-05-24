import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { logAdminAction } from "@/lib/admin/audit";
import { reviewEvent, type EventReviewStatus } from "@/lib/admin/events";

const AUDIT_ACTION: Record<EventReviewStatus, string> = {
  published: "event.approved",
  cancelled: "event.rejected",
  draft: "event.returned",
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const body = (await request.json()) as {
    status: EventReviewStatus;
    notes?: string;
  };

  if (!body.status || !["published", "cancelled", "draft"].includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    await reviewEvent(id, body.status);
    await logAdminAction({
      adminId: auth.user!.id,
      action: AUDIT_ACTION[body.status],
      entityType: "event",
      entityId: id,
      payload: body.notes?.trim() ? { notes: body.notes.trim() } : undefined,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
