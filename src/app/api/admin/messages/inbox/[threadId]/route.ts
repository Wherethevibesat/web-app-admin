import { NextResponse } from "next/server";
import { listThreadMessages } from "@/lib/admin/messages";
import { requireAdmin } from "@/lib/admin/require-admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const auth = await requireAdmin("messages");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { threadId } = await params;
  try {
    const messages = await listThreadMessages(threadId);
    return NextResponse.json({ messages });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load thread";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
