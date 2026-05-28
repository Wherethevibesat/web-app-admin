import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { StripeKeysForm } from "@/components/admin/stripe-keys-form";
import { requireAdminPage } from "@/lib/admin/require-admin-page";
import { getStripeSettings } from "@/lib/admin/stripe";

export default async function StripeKeysPage() {
  await requireAdminPage("settings");
  const settings = await getStripeSettings().catch(() => ({
    id: 1,
    publishable_key: null,
    updated_at: new Date().toISOString(),
  }));

  return (
    <div>
      <PageHeader title="Stripe API keys" description="Publishable key for checkout UI.">
        <Link href="/settings" className="text-sm text-wtva-muted underline">
          Settings
        </Link>
      </PageHeader>
      <StripeKeysForm initialPublishable={settings.publishable_key ?? ""} />
    </div>
  );
}
