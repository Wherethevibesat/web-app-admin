import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncAdminProfile } from "@/lib/auth/sync-admin-profile";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const role = await syncAdminProfile(user);
  if (!role) {
    return NextResponse.json(
      { error: "Could not sync profile. Check .env.local and restart." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, email: user.email, role });
}
