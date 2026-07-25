import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { StripeAccountsTable } from "@/components/admin/stripe-accounts-table";
import { requireAdminPage } from "@/lib/admin/require-admin-page";
import { listStripeAccounts } from "@/lib/admin/stripe";

export default async function StripeAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ stripe?: string }>;
}) {
  await requireAdminPage("settings");
  const { stripe } = await searchParams;
  let accounts: Awaited<ReturnType<typeof listStripeAccounts>> = [];
  let error: string | null = null;

  try {
    accounts = await listStripeAccounts();
  } catch (e) {
    error =
      e instanceof Error
        ? e.message
        : "Run 005_stripe_and_withdrawals.sql in Supabase";
  }

  return (
    <div>
      <PageHeader
        title="Stripe connected accounts"
        description="Connect, finish onboarding, or disconnect venue payout accounts."
      >
        <div className="flex gap-4 text-sm">
          <Link
            href="/settings?tab=payments"
            className="text-wtva-muted underline"
          >
            ← Payments settings
          </Link>
          <Link href="/settings/stripe/keys" className="text-wtva-muted underline">
            API keys
          </Link>
        </div>
      </PageHeader>

      {stripe === "return" && (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Returned from Stripe. Refresh if status still shows pending — it can take a
          moment to update.
        </p>
      )}
      {stripe === "refresh" && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Onboarding link expired. Use Continue setup on the account to try again.
        </p>
      )}

      {error && <p className="mb-4 text-sm text-amber-700">{error}</p>}

      {accounts.length === 0 && !error ? (
        <p className="text-wtva-muted">
          No connected accounts yet. Venue owners can connect from the business portal,
          or you can reconnect after they appear here.
        </p>
      ) : (
        <StripeAccountsTable accounts={accounts} />
      )}
    </div>
  );
}
