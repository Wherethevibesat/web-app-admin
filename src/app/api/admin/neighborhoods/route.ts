import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { logAdminAction } from "@/lib/admin/audit";
import { upsertNeighborhood } from "@/lib/admin/neighborhoods";
import type { NeighborhoodFormData } from "@/lib/types/neighborhood";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await request.json()) as NeighborhoodFormData;
    const id = await upsertNeighborhood(body);
    await logAdminAction({
      adminId: auth.user!.id,
      action: body.id ? "neighborhood.update" : "neighborhood.create",
      entityType: "neighborhood",
      entityId: id,
      payload: { name: body.name, city: body.city },
    });
    return NextResponse.json({ id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
