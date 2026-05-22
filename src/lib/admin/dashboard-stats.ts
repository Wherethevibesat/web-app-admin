import { createAdminClient } from "@/lib/supabase/admin";
import type { DashboardStats } from "@/lib/types/database";

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const admin = createAdminClient();

  const [venuesRes, usersRes, verificationRes, eventsRes, transactionsRes] =
    await Promise.all([
      admin.from("venues").select("id, featured", { count: "exact" }),
      admin.from("users").select("id", { count: "exact", head: true }),
      admin
        .from("venues")
        .select("id", { count: "exact", head: true })
        .eq("verification_status", "pending"),
      admin.from("events").select("id, featured", { count: "exact" }),
      admin.from("platform_transactions").select("amount, status"),
    ]);

  const totalVenues = venuesRes.count ?? 0;
  const totalUsers = usersRes.count ?? 0;
  const pendingVerification = verificationRes.count ?? 0;

  let totalEvents: number | null = null;
  let featuredEvents: number | null = null;
  if (!eventsRes.error) {
    totalEvents = eventsRes.count ?? 0;
    featuredEvents =
      eventsRes.data?.filter((e) => e.featured).length ?? null;
  }

  const featuredVenues =
    venuesRes.data?.filter((v) => v.featured).length ?? null;

  let unpublished = 0;
  const { count: unpubCount } = await admin
    .from("venues")
    .select("id", { count: "exact", head: true })
    .eq("published", false);
  unpublished = unpubCount ?? 0;

  let pendingEvents = 0;
  const { count: pe } = await admin
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending_review");
  if (!eventsRes.error) pendingEvents = pe ?? 0;

  let totalEarnings: number | null = null;
  let pendingPayments: number | null = null;
  if (!transactionsRes.error && transactionsRes.data) {
    const rows = transactionsRes.data;
    totalEarnings = rows
      .filter((t) => t.status === "completed")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    pendingPayments = rows.filter((t) => t.status === "pending").length;
  }

  return {
    totalVenues,
    totalEvents,
    pendingSubmissions: pendingVerification + unpublished + pendingEvents,
    totalUsers,
    featuredVenues,
    featuredEvents,
    totalEarnings,
    pendingPayments,
    pendingVerification,
  };
}
