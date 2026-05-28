import { NextResponse } from "next/server";
import { searchUsersForSupport } from "@/lib/admin/messages";
import { requireAdmin } from "@/lib/admin/require-admin";

export async function GET(request: Request) {
  const auth = await requireAdmin("messages");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const q = new URL(request.url).searchParams.get("q") ?? "";
  try {
    const users = await searchUsersForSupport(q);
    return NextResponse.json({ users });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
