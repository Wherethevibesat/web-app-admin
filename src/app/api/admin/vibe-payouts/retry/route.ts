import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { logAdminAction } from "@/lib/admin/audit";
import { retryFailedVibePayouts } from "@/lib/admin/vibe-payouts";

export async function POST(request: Request) {
  const auth = await requireAdmin("vip_packages");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as {
    orderId?: string;
    stopId?: string;
  };

  try {
    const result = await retryFailedVibePayouts({
      orderId: body.orderId,
      stopId: body.stopId,
    });
    await logAdminAction({
      adminId: auth.user!.id,
      action: "vibe_payouts.retry",
      entityType: "night_package_order",
      entityId: body.orderId ?? body.stopId ?? "batch",
      payload: result,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Retry failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
