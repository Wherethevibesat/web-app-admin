import { NextResponse } from "next/server";
import { logAdminAction } from "@/lib/admin/audit";
import { createCampaign, listCampaigns, sendCampaign } from "@/lib/admin/messages";
import type { MessageAudience, MessageChannel } from "@/lib/admin/messages";
import { requireAdmin } from "@/lib/admin/require-admin";

const AUDIENCES: MessageAudience[] = ["customer", "driver", "venueOwner", "promoter"];
const CHANNELS: MessageChannel[] = ["email", "in_app"];

export async function GET() {
  const auth = await requireAdmin("messages");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const campaigns = await listCampaigns();
    return NextResponse.json({ campaigns });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load campaigns";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin("messages");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json()) as {
    subject?: string;
    body?: string;
    imageUrl?: string | null;
    audience?: MessageAudience;
    channels?: MessageChannel[];
    sendNow?: boolean;
  };

  if (!body.subject?.trim() || !body.body?.trim()) {
    return NextResponse.json({ error: "Subject and body are required" }, { status: 400 });
  }
  if (!body.audience || !AUDIENCES.includes(body.audience)) {
    return NextResponse.json({ error: "Invalid audience" }, { status: 400 });
  }

  const channels = (body.channels ?? ["email", "in_app"]).filter((c) => CHANNELS.includes(c));
  if (channels.length === 0) {
    return NextResponse.json({ error: "Select at least one channel" }, { status: 400 });
  }

  try {
    const campaign = await createCampaign({
      subject: body.subject,
      body: body.body,
      imageUrl: body.imageUrl,
      audience: body.audience,
      channels,
      createdBy: auth.user!.id,
    });

    let sendResult = null;
    if (body.sendNow) {
      sendResult = await sendCampaign(campaign.id);
      await logAdminAction({
        adminId: auth.user!.id,
        action: "message_campaign.send",
        entityType: "admin_message_campaign",
        entityId: campaign.id,
        payload: sendResult,
      });
    } else {
      await logAdminAction({
        adminId: auth.user!.id,
        action: "message_campaign.create",
        entityType: "admin_message_campaign",
        entityId: campaign.id,
        payload: { audience: body.audience, channels },
      });
    }

    return NextResponse.json({ ok: true, campaign, sendResult });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create campaign";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
