import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { logAdminAction } from "@/lib/admin/audit";
import { getPlatformSettings, savePlatformSettings } from "@/lib/admin/settings";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const settings = await getPlatformSettings();
    return NextResponse.json(settings);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Load failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    await savePlatformSettings(body);
    await logAdminAction({
      adminId: auth.user!.id,
      action: "settings.update",
      entityType: "platform_settings",
      entityId: "1",
      payload: body,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
