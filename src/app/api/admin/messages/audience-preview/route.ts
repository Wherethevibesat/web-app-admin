import { NextResponse } from "next/server";
import { resolveAudienceRecipients } from "@/lib/admin/messages";
import type { MessageAudience } from "@/lib/admin/messages";
import { requireAdmin } from "@/lib/admin/require-admin";

const AUDIENCES: MessageAudience[] = ["customer", "driver", "venueOwner", "promoter"];

export async function GET(request: Request) {
  const auth = await requireAdmin("messages");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const audience = new URL(request.url).searchParams.get("audience") as MessageAudience;
  if (!AUDIENCES.includes(audience)) {
    return NextResponse.json({ error: "Invalid audience" }, { status: 400 });
  }

  try {
    const recipients = await resolveAudienceRecipients(audience);
    return NextResponse.json({ count: recipients.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Preview failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
