import { NextResponse } from "next/server";
import { listSupportThreads } from "@/lib/admin/messages";
import { requireAdmin } from "@/lib/admin/require-admin";

export async function GET() {
  const auth = await requireAdmin("messages");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const threads = await listSupportThreads();
    return NextResponse.json({ threads });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load inbox";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
