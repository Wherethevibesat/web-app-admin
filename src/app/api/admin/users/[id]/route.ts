import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { logAdminAction } from "@/lib/admin/audit";
import { deleteUser, getUser, updateUser } from "@/lib/admin/users";
import type { UserRole } from "@/lib/types/database";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const body = (await request.json()) as {
    name?: string;
    email?: string;
    role?: UserRole;
  };

  if (body.role && !["customer", "venueOwner", "admin"].includes(body.role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  try {
    const before = await getUser(id);
    await updateUser(id, {
      name: body.name,
      email: body.email,
      role: body.role,
    });
    await logAdminAction({
      adminId: auth.user!.id,
      action: "user.update",
      entityType: "user",
      entityId: id,
      payload: { before, after: body },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;

  if (id === auth.user!.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account while signed in." },
      { status: 400 },
    );
  }

  try {
    const before = await getUser(id);
    if (!before) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    await deleteUser(id);
    await logAdminAction({
      adminId: auth.user!.id,
      action: "user.delete",
      entityType: "user",
      entityId: id,
      payload: { email: before.email, name: before.name },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
