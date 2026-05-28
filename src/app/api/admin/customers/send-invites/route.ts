import { NextResponse } from "next/server";
import { logAdminAction } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/admin/require-admin";
import { retryFailedCustomerInvites, sendCustomerInvites } from "@/lib/admin/customers";

export async function POST(request: Request) {
  const auth = await requireAdmin("customers");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json().catch(() => ({}))) as {
    batchSize?: number;
    sendAll?: boolean;
    retryFailed?: boolean;
  };
  const batchSize = Math.min(Math.max(Number(body.batchSize ?? 1000), 1), 2000);

  try {
    if (body.sendAll) {
      let totalProcessed = 0;
      let totalInvited = 0;
      let totalFailed = 0;
      let loops = 0;
      const maxLoops = 50;

      while (loops < maxLoops) {
        const result = body.retryFailed
          ? await retryFailedCustomerInvites(batchSize)
          : await sendCustomerInvites(batchSize);
        totalProcessed += result.processed;
        totalInvited += result.invited;
        totalFailed += result.failed;
        loops += 1;
        if (result.processed < batchSize) break;
      }

      await logAdminAction({
        adminId: auth.user!.id,
        action: body.retryFailed ? "customers.retry_failed_invites_all" : "customers.send_invites_all",
        entityType: "customer_import_contacts",
        payload: {
          batchSize,
          loops,
          processed: totalProcessed,
          invited: totalInvited,
          failed: totalFailed,
        },
      });
      return NextResponse.json({
        ok: true,
        processed: totalProcessed,
        invited: totalInvited,
        failed: totalFailed,
        loops,
      });
    }

    const result = body.retryFailed
      ? await retryFailedCustomerInvites(batchSize)
      : await sendCustomerInvites(batchSize);
    await logAdminAction({
      adminId: auth.user!.id,
      action: body.retryFailed ? "customers.retry_failed_invites" : "customers.send_invites",
      entityType: "customer_import_contacts",
      payload: { batchSize, ...result },
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send invites";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
