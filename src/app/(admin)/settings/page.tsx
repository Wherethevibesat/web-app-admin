import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { getPlatformSettings } from "@/lib/admin/settings";

export default async function SettingsPage() {
  const settings = await getPlatformSettings().catch(() => ({
    id: 1,
    venue_submission_fee: 50,
    venue_listing_months: 3,
    event_submission_fee: 25,
    event_ticket_commission_pct: 10,
    vip_commission_pct: 10,
    driver_listing_fee: 50,
    driver_listing_months: 3,
    driver_booking_commission_pct: 10,
    auto_approve_venues: false,
    auto_approve_events: false,
    require_payment: true,
    updated_at: new Date().toISOString(),
  }));

  return (
    <div>
      <PageHeader
        title="Platform settings"
        description="Fees and approval rules for submissions."
      />
      <div className="mb-6 flex gap-4 text-sm">
        <Link href="/settings/stripe/keys" className="text-wtva-muted underline">
          Stripe keys
        </Link>
        <Link
          href="/settings/stripe/accounts"
          className="text-wtva-muted underline"
        >
          Connected accounts
        </Link>
      </div>
      <SettingsForm initial={settings} />
    </div>
  );
}
