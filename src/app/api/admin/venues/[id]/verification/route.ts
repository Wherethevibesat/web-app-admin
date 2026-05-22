import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { logAdminAction } from "@/lib/admin/audit";
import { setVerificationStatus } from "@/lib/admin/venues";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const { status } = (await request.json()) as {
    status: "approved" | "rejected";
  };

  if (status !== "approved" && status !== "rejected") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    await setVerificationStatus(id, status);
    await logAdminAction({
      adminId: auth.user!.id,
      action: `verification.${status}`,
      entityType: "venue",
      entityId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
