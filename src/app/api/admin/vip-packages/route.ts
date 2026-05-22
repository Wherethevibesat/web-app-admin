import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { logAdminAction } from "@/lib/admin/audit";
import { upsertVipPackage } from "@/lib/admin/vip";
import type { VipFormData } from "@/lib/types/vip";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await request.json()) as VipFormData;
    const id = await upsertVipPackage(body);
    await logAdminAction({
      adminId: auth.user!.id,
      action: body.id ? "vip.update" : "vip.create",
      entityType: "vip_package",
      entityId: id,
    });
    return NextResponse.json({ id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
