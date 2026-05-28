import { NextResponse } from "next/server";
import { logAdminAction } from "@/lib/admin/audit";
import { createBusinessImpersonationUrl } from "@/lib/admin/impersonate";
import { requireAdmin } from "@/lib/admin/require-admin";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const result = await createBusinessImpersonationUrl({
      adminId: auth.user!.id,
      userId,
    });

    await logAdminAction({
      adminId: auth.user!.id,
      action: "impersonate_business_user",
      entityType: "user",
      entityId: userId,
      payload: {
        role: result.role,
        email: result.email,
      },
    });

    return NextResponse.json({ url: result.url, role: result.role });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Impersonation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
