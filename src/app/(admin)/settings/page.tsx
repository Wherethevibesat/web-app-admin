import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { getPlatformSettings } from "@/lib/admin/settings";

export default async function SettingsPage() {
  const settings = await getPlatformSettings().catch(() => ({
    id: 1,
    venue_submission_fee: 50,
    event_submission_fee: 25,
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
