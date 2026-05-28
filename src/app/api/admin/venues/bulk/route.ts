import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { logAdminAction } from "@/lib/admin/audit";
import { bulkResultResponse } from "@/lib/admin/bulk-result";
import {
  bulkDeleteVenues,
  bulkPatchVenues,
  bulkVerifyVenues,
} from "@/lib/admin/bulk-handlers";

const PATCH_ACTIONS: Record<string, Record<string, unknown>> = {
  publish: { published: true },
  unpublish: { published: false },
  feature: { featured: true },
  unfeature: { featured: false },
};

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

  try {
    let result;
    if (action === "delete") {
      result = await bulkDeleteVenues(ids);
    } else if (action === "verify_approve") {
      result = await bulkVerifyVenues(ids, "approved");
    } else if (action === "verify_reject") {
      result = await bulkVerifyVenues(ids, "rejected");
    } else if (PATCH_ACTIONS[action]) {
      result = await bulkPatchVenues(ids, PATCH_ACTIONS[action]);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const out = bulkResultResponse(result);
    if (result.succeeded.length) {
      await logAdminAction({
        adminId: auth.user!.id,
        action: `venue.bulk_${action}`,
        entityType: "venue",
        payload: { ids: result.succeeded, failed: result.failed },
      });
    }
    return NextResponse.json(out.body, { status: out.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bulk update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
