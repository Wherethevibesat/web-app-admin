import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { logAdminAction } from "@/lib/admin/audit";
import { getStripeSettings, saveStripePublishableKey } from "@/lib/admin/stripe";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  try {
    const settings = await getStripeSettings();
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
  const { publishable_key } = (await request.json()) as {
    publishable_key: string;
  };
  try {
    await saveStripePublishableKey(publishable_key);
    await logAdminAction({
      adminId: auth.user!.id,
      action: "stripe.publishable_key_update",
      entityType: "stripe_settings",
      entityId: "1",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
