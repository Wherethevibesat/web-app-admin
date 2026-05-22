import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const patch = await request.json();

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("venues")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;

    await logAdminAction({
      adminId: auth.user!.id,
      action: "venue.patch",
      entityType: "venue",
      entityId: id,
      payload: patch,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
