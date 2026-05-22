import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { logAdminAction } from "@/lib/admin/audit";
import { upsertEvent } from "@/lib/admin/events";
import type { EventFormData } from "@/lib/types/event";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await request.json()) as EventFormData;
    const id = await upsertEvent(body);
    await logAdminAction({
      adminId: auth.user!.id,
      action: body.id ? "event.update" : "event.create",
      entityType: "event",
      entityId: id,
    });
    return NextResponse.json({ id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
