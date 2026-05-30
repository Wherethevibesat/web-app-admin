import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { logAdminAction } from "@/lib/admin/audit";
import { createWithdrawal } from "@/lib/admin/stripe";
import { createPlatformPayout } from "@/lib/admin/stripe-payout";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { amount, notes } = (await request.json()) as {
    amount: number;
    notes?: string;
  };

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  try {
    const id = await createWithdrawal({
      amount,
      created_by: auth.user!.id,
      notes,
    });

    let stripePayoutId: string | null = null;
    let status: "pending" | "completed" | "failed" = "pending";
    let message =
      "Withdrawal recorded as pending. Set STRIPE_SECRET_KEY on the admin app to auto-create Stripe payouts.";

    try {
      stripePayoutId = await createPlatformPayout(amount);
      status = "completed";
      message = "Withdrawal submitted to Stripe.";
    } catch (payoutErr) {
      const payoutMessage =
        payoutErr instanceof Error ? payoutErr.message : "Stripe payout failed";
      if (process.env.STRIPE_SECRET_KEY) {
        status = "failed";
        message = payoutMessage;
      }
    }

    const admin = createAdminClient();
    await admin
      .from("withdrawals")
      .update({
        status,
        stripe_transfer_id: stripePayoutId,
      })
      .eq("id", id);

    await logAdminAction({
      adminId: auth.user!.id,
      action: "withdrawal.request",
      entityType: "withdrawal",
      entityId: id,
      payload: { amount, notes, status, stripePayoutId },
    });
    return NextResponse.json({
      id,
      status,
      stripePayoutId,
      message,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
