import { NextResponse } from "next/server";
import { logAdminAction } from "@/lib/admin/audit";
import {
  activatePaidHomepageFeature,
  deactivateHomepageFeature,
} from "@/lib/admin/featured-events";
import { requireAdmin } from "@/lib/admin/require-admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin("events");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    action?: "activate_paid" | "deactivate";
  };
  const action = body.action ?? "activate_paid";

  try {
    if (action === "deactivate") {
      await deactivateHomepageFeature(id);
      await logAdminAction({
        adminId: auth.user!.id,
        action: "event.homepage_featured_deactivate",
        entityType: "event",
        entityId: id,
      });
      return NextResponse.json({ ok: true });
    }

    const result = await activatePaidHomepageFeature(id, auth.user!.id);
    await logAdminAction({
      adminId: auth.user!.id,
      action: "event.homepage_featured_activate_paid",
      entityType: "event",
      entityId: id,
      payload: result,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Feature update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
