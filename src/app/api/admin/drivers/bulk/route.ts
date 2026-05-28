import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { logAdminAction } from "@/lib/admin/audit";
import { bulkResultResponse } from "@/lib/admin/bulk-result";
import { bulkPatchDrivers } from "@/lib/admin/bulk-handlers";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json()) as { ids?: string[]; action?: string };
  const ids = Array.isArray(body.ids) ? body.ids : [];
  const action = body.action ?? "";

  if (!ids.length) {
    return NextResponse.json({ error: "No items selected" }, { status: 400 });
  }

  if (action !== "publish" && action !== "unpublish") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    const result = await bulkPatchDrivers(ids, action === "publish");
    const out = bulkResultResponse(result);
    if (result.succeeded.length) {
      await logAdminAction({
        adminId: auth.user!.id,
        action: `driver.bulk_${action}`,
        entityType: "driver_company",
        payload: { ids: result.succeeded, failed: result.failed },
      });
    }
    return NextResponse.json(out.body, { status: out.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bulk update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
