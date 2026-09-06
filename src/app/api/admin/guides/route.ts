import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { logAdminAction } from "@/lib/admin/audit";
import { upsertEventGuide } from "@/lib/admin/event-guides";
import type { EventGuideFormData } from "@/lib/types/event-guide";

export async function POST(request: Request) {
  const auth = await requireAdmin("events");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await request.json()) as EventGuideFormData;
    const id = await upsertEventGuide(body);
    await logAdminAction({
      adminId: auth.user!.id,
      action: body.id ? "event_guide.update" : "event_guide.create",
      entityType: "event_guide",
      entityId: id,
    });
    return NextResponse.json({ id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
