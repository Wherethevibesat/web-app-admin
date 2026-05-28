import { NextResponse } from "next/server";
import { logAdminAction } from "@/lib/admin/audit";
import {
  findOrCreateSupportThread,
  sendSupportMessage,
} from "@/lib/admin/messages";
import { requireAdmin } from "@/lib/admin/require-admin";

export async function POST(request: Request) {
  const auth = await requireAdmin("messages");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json()) as {
    userId?: string;
    threadId?: string;
    message?: string;
  };

  if (!body.message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  try {
    let threadId = body.threadId;
    if (!threadId) {
      if (!body.userId) {
        return NextResponse.json({ error: "userId or threadId required" }, { status: 400 });
      }
      threadId = await findOrCreateSupportThread(auth.user!.id, body.userId);
    }

    await sendSupportMessage(auth.user!.id, threadId, body.message);
    await logAdminAction({
      adminId: auth.user!.id,
      action: "support_message.send",
      entityType: "chat_thread",
      entityId: threadId,
      payload: { userId: body.userId },
    });

    return NextResponse.json({ ok: true, threadId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send message";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
