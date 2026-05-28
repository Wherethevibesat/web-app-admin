import { NextResponse } from "next/server";
import { logAdminAction } from "@/lib/admin/audit";
import { sendCampaign } from "@/lib/admin/messages";
import { requireAdmin } from "@/lib/admin/require-admin";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin("messages");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  try {
    const result = await sendCampaign(id);
    await logAdminAction({
      adminId: auth.user!.id,
      action: "message_campaign.send",
      entityType: "admin_message_campaign",
      entityId: id,
      payload: result,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
