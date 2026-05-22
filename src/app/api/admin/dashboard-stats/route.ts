import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchDashboardStats } from "@/lib/admin/dashboard-stats";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const stats = await fetchDashboardStats();
    return NextResponse.json(stats);
  } catch (err) {
    console.error("dashboard-stats", err);
    return NextResponse.json(
      { error: "Failed to load dashboard stats" },
      { status: 500 },
    );
  }
}
