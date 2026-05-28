import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { logAdminAction } from "@/lib/admin/audit";
import { updateUser } from "@/lib/admin/users";
import type { UserRole } from "@/lib/types/database";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin("users");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const { role } = (await request.json()) as { role: UserRole };

  if (!["customer", "venueOwner", "admin", "driver", "promoter"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  try {
    await updateUser(id, { role });
    await logAdminAction({
      adminId: auth.user!.id,
      action: "user.role_change",
      entityType: "user",
      entityId: id,
      payload: { role },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
