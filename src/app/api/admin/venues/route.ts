import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { logAdminAction } from "@/lib/admin/audit";
import { upsertVenue } from "@/lib/admin/venues";
import type { VenueFormData } from "@/lib/types/venue";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await request.json()) as VenueFormData & { id?: string };
    const id = await upsertVenue(body, body.id);
    await logAdminAction({
      adminId: auth.user!.id,
      action: body.id ? "venue.update" : "venue.create",
      entityType: "venue",
      entityId: id,
    });
    return NextResponse.json({ id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
