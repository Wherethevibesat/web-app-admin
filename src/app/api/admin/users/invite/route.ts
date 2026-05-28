import { NextResponse } from "next/server";
import { logAdminAction } from "@/lib/admin/audit";
import { ADMIN_PERMISSIONS } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/admin/require-admin";
import { createOrPromoteAdmin } from "@/lib/admin/users";

export async function POST(request: Request) {
  const auth = await requireAdmin("users");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json()) as {
    email?: string;
    name?: string;
    adminPermissions?: string[];
  };

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const adminPermissions = Array.isArray(body.adminPermissions)
    ? body.adminPermissions.filter((perm) => ADMIN_PERMISSIONS.includes(perm as never))
    : ["all"];

  try {
    const result = await createOrPromoteAdmin({
      email,
      name: body.name,
      adminPermissions: adminPermissions.length > 0 ? adminPermissions : ["all"],
    });

    await logAdminAction({
      adminId: auth.user!.id,
      action: "admin.invite_or_promote",
      entityType: "user",
      entityId: result.userId,
      payload: {
        email,
        created: result.created,
        permissions: adminPermissions,
      },
    });

    return NextResponse.json({ ok: true, created: result.created, userId: result.userId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create admin";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
