import { Suspense } from "react";
import { PageHeader } from "@/components/admin/page-header";
import { AccountSettingsForm } from "@/components/admin/account-settings-form";
import { PaymentsSettingsPanel } from "@/components/admin/payments-settings-panel";
import { SettingsForm } from "@/components/admin/settings-form";
import {
  SettingsTabs,
  type SettingsTabId,
} from "@/components/admin/settings-tabs";
import { hasAdminPermission } from "@/lib/admin/permissions";
import { requireAdminSession } from "@/lib/admin/require-admin-session";
import { getPlatformSettings } from "@/lib/admin/settings";
import { redirect } from "next/navigation";

const DESCRIPTIONS: Record<SettingsTabId, { title: string; description: string }> = {
  account: {
    title: "Settings",
    description: "Your admin profile and password.",
  },
  platform: {
    title: "Settings",
    description: "Fees, commissions, and approval rules for the marketplace.",
  },
  payments: {
    title: "Settings",
    description: "Stripe keys and Connected accounts for checkout and payouts.",
  },
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { profile } = await requireAdminSession();
  const canManagePlatform = hasAdminPermission(profile.metadata, "settings");
  const { tab: rawTab } = await searchParams;

  const allowedTabs: SettingsTabId[] = canManagePlatform
    ? ["account", "platform", "payments"]
    : ["account"];

  const requested = (rawTab ?? (canManagePlatform ? "platform" : "account")) as string;
  const tab = (allowedTabs.includes(requested as SettingsTabId)
    ? requested
    : allowedTabs[0]) as SettingsTabId;

  if (!rawTab || rawTab !== tab) {
    redirect(`/settings?tab=${tab}`);
  }

  const copy = DESCRIPTIONS[tab];
  let platformSettings = null;
  if (tab === "platform" && canManagePlatform) {
    platformSettings = await getPlatformSettings().catch(() => ({
      id: 1,
      venue_submission_fee: 50,
      venue_listing_months: 3,
      event_submission_fee: 25,
      event_ticket_commission_pct: 10,
      vip_commission_pct: 10,
      night_package_commission_pct: 15,
      driver_listing_fee: 50,
      driver_listing_months: 3,
      driver_booking_commission_pct: 10,
      featured_event_price: 75,
      featured_event_days: 7,
      featured_event_max_slots: 6,
      auto_approve_venues: false,
      auto_approve_events: false,
      require_payment: true,
      updated_at: new Date().toISOString(),
    }));
  }

  return (
    <div>
      <PageHeader title={copy.title} description={copy.description} />
      <Suspense fallback={null}>
        <SettingsTabs allowedTabs={allowedTabs} />
      </Suspense>

      {tab === "account" && (
        <AccountSettingsForm
          email={profile.email ?? ""}
          fullName={typeof profile.name === "string" ? profile.name : ""}
        />
      )}

      {tab === "platform" && platformSettings && (
        <SettingsForm initial={platformSettings} />
      )}

      {tab === "payments" && canManagePlatform && <PaymentsSettingsPanel />}
    </div>
  );
}
