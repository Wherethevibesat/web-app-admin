import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { logAdminAction } from "@/lib/admin/audit";
import { bulkResultResponse } from "@/lib/admin/bulk-result";
import { bulkDeleteUsers, bulkSetUserRole } from "@/lib/admin/bulk-handlers";
import type { UserRole } from "@/lib/types/database";

const ROLES: UserRole[] = ["customer", "venueOwner", "driver", "promoter", "admin"];

export async function POST(request: Request) {
  const auth = await requireAdmin("users");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json()) as {
    ids?: string[];
    action?: string;
    role?: UserRole;
  };
  const ids = Array.isArray(body.ids) ? body.ids : [];
  const action = body.action ?? "";

  if (!ids.length) {
    return NextResponse.json({ error: "No items selected" }, { status: 400 });
  }

  try {
    let result;
    if (action === "delete") {
      result = await bulkDeleteUsers(ids);
    } else if (action === "set_role") {
      if (!body.role || !ROLES.includes(body.role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      result = await bulkSetUserRole(ids, body.role);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const out = bulkResultResponse(result);
    if (result.succeeded.length) {
      await logAdminAction({
        adminId: auth.user!.id,
        action: `user.bulk_${action}`,
        entityType: "user",
        payload: { ids: result.succeeded, role: body.role, failed: result.failed },
      });
    }
    return NextResponse.json(out.body, { status: out.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bulk update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
