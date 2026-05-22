import Link from "next/link";
import {
  Building2,
  Calendar,
  DollarSign,
  FileCheck,
  Settings,
  Shield,
  Star,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/admin/stat-card";
import { ManagementCard } from "@/components/admin/management-card";
import { formatCurrency } from "@/lib/utils";
import type { DashboardStats } from "@/lib/types/database";

async function getStatsDirect(): Promise<DashboardStats> {
  const { fetchDashboardStats } = await import("@/lib/admin/dashboard-stats");
  try {
    return await fetchDashboardStats();
  } catch {
    return {
      totalVenues: 0,
      totalEvents: null,
      pendingSubmissions: 0,
      totalUsers: 0,
      featuredVenues: null,
      featuredEvents: null,
      totalEarnings: null,
      pendingPayments: null,
      pendingVerification: 0,
    };
  }
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("users").select("name").eq("id", user.id).single()
    : { data: null };

  let stats = await getStatsDirect();

  const displayName = profile?.name ?? "Admin";

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-wtva-dark-300 bg-wtva-card p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-wtva-dark-300 p-3">
            <Shield className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Welcome, {displayName}</h1>
            <p className="mt-1 text-wtva-muted">Manage your platform</p>
          </div>
        </div>
      </div>

      <section>
        <h2 className="mb-4 text-lg font-bold">Quick Stats</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Venues"
            value={String(stats.totalVenues)}
            icon={Building2}
            href="/venues"
          />
          <StatCard
            title="Events"
            value={
              stats.totalEvents != null ? String(stats.totalEvents) : "—"
            }
            icon={Calendar}
            href="/events"
          />
          <StatCard
            title="Pending"
            value={String(stats.pendingSubmissions)}
            icon={FileCheck}
            href="/submissions"
          />
          <StatCard
            title="Users"
            value={String(stats.totalUsers)}
            icon={Users}
            href="/users"
          />
        </div>
      </section>

      {stats.totalEarnings != null && (
        <Link
          href="/earnings"
          className="block rounded-xl border border-wtva-dark-300 bg-foreground p-6 text-background transition-opacity hover:opacity-95"
        >
          <div className="flex items-center gap-5">
            <div className="rounded-xl bg-background/20 p-4">
              <DollarSign className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium opacity-90">Platform Earnings</p>
              <p className="text-3xl font-bold">
                {formatCurrency(stats.totalEarnings)}
              </p>
              {stats.pendingPayments != null && stats.pendingPayments > 0 && (
                <span className="mt-2 inline-block rounded-lg bg-amber-600 px-2 py-1 text-xs font-semibold text-white">
                  {stats.pendingPayments} pending payment(s)
                </span>
              )}
            </div>
          </div>
        </Link>
      )}

      <section>
        <h2 className="mb-4 text-lg font-bold">Management</h2>
        <div className="grid gap-3">
          <ManagementCard
            title="Venues"
            description="Manage venues, approve submissions, feature venues"
            icon={Building2}
            href="/venues"
          />
          <ManagementCard
            title="Events"
            description="Manage events, approve submissions, feature events"
            icon={Calendar}
            href="/events"
          />
          <ManagementCard
            title="VIP Packages"
            description="Create and manage VIP packages for venues and events"
            icon={Star}
            href="/vip-packages"
          />
          <ManagementCard
            title="Pending Submissions"
            description={`${stats.pendingSubmissions} items awaiting approval`}
            icon={FileCheck}
            href="/submissions"
            badge={stats.pendingSubmissions}
          />
          <ManagementCard
            title="Users"
            description="Manage user accounts, roles, and permissions"
            icon={Users}
            href="/users"
          />
          <ManagementCard
            title="Settings"
            description="Configure fees, app settings, and preferences"
            icon={Settings}
            href="/settings"
          />
        </div>
      </section>
    </div>
  );
}
