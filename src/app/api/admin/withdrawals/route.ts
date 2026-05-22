import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { logAdminAction } from "@/lib/admin/audit";
import { createWithdrawal } from "@/lib/admin/stripe";

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
    await logAdminAction({
      adminId: auth.user!.id,
      action: "withdrawal.request",
      entityType: "withdrawal",
      entityId: id,
      payload: { amount, notes },
    });
    return NextResponse.json({
      id,
      message:
        "Withdrawal recorded as pending. Connect Stripe Edge Function stripe-create-payout to complete transfers.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
