import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { logAdminAction } from "@/lib/admin/audit";
import { updateEventStatus } from "@/lib/admin/events";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const { status } = (await request.json()) as {
    status: "published" | "cancelled";
  };

  try {
    await updateEventStatus(id, status);
    await logAdminAction({
      adminId: auth.user!.id,
      action: `event.${status}`,
      entityType: "event",
      entityId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
