import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { logAdminAction } from "@/lib/admin/audit";
import {
  createStripeReconnectLink,
  disconnectStripeAccountById,
} from "@/lib/admin/stripe";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireAdmin("settings");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await ctx.params;
  try {
    const result = await disconnectStripeAccountById(id);
    await logAdminAction({
      adminId: auth.user!.id,
      action: "stripe.account_disconnect",
      entityType: "stripe_accounts",
      entityId: id,
      payload: { user_id: result.userId },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Disconnect failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Reconnect / finish onboarding — returns Stripe Account Link URL. */
export async function POST(_request: Request, ctx: Ctx) {
  const auth = await requireAdmin("settings");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await ctx.params;
  try {
    const url = await createStripeReconnectLink(id);
    await logAdminAction({
      adminId: auth.user!.id,
      action: "stripe.account_reconnect",
      entityType: "stripe_accounts",
      entityId: id,
    });
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Reconnect failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
