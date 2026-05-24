import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { logAdminAction } from "@/lib/admin/audit";
import { reviewEventsBulk, type EventReviewStatus } from "@/lib/admin/events";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json()) as {
    ids?: string[];
    status?: EventReviewStatus;
  };

  const ids = Array.isArray(body.ids) ? body.ids : [];
  const status = body.status ?? "published";

  if (ids.length === 0) {
    return NextResponse.json({ error: "No events selected" }, { status: 400 });
  }

  if (!["published", "cancelled", "draft"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const result = await reviewEventsBulk(ids, status);

    if (result.succeeded.length > 0) {
      await logAdminAction({
        adminId: auth.user!.id,
        action: status === "published" ? "event.bulk_approved" : `event.bulk_${status}`,
        entityType: "event",
        payload: { ids: result.succeeded, status, failed: result.failed },
      });
    }

    if (result.succeeded.length === 0) {
      return NextResponse.json(
        { error: result.failed[0]?.error ?? "No events were updated", ...result },
        { status: 400 },
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bulk update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
