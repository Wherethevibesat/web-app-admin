import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/admin/data-table";
import { requireAdminPage } from "@/lib/admin/require-admin-page";
import { listStripeAccounts } from "@/lib/admin/stripe";

export default async function StripeAccountsPage() {
  await requireAdminPage("settings");
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
        description="Connect accounts from the mobile app or Stripe Dashboard."
      >
        <Link href="/settings/stripe/keys" className="text-sm text-wtva-muted underline">
          API keys
        </Link>
      </PageHeader>

      {error && <p className="mb-4 text-amber-400">{error}</p>}

      {accounts.length === 0 && !error ? (
        <p className="text-wtva-muted">No connected accounts yet.</p>
      ) : (
        <DataTable>
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>Name</DataTableHeaderCell>
              <DataTableHeaderCell>Email</DataTableHeaderCell>
              <DataTableHeaderCell>Last4</DataTableHeaderCell>
              <DataTableHeaderCell>Status</DataTableHeaderCell>
              <DataTableHeaderCell>Default</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {accounts.map((a) => (
              <DataTableRow key={a.id}>
                <DataTableCell className="font-medium">{a.account_name}</DataTableCell>
                <DataTableCell>{a.email ?? "—"}</DataTableCell>
                <DataTableCell>{a.last4 ? `•••• ${a.last4}` : "—"}</DataTableCell>
                <DataTableCell>
                  <Badge variant={a.status === "active" ? "success" : "default"}>
                    {a.status ?? "—"}
                  </Badge>
                </DataTableCell>
                <DataTableCell>{a.is_default ? "Yes" : "—"}</DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </div>
  );
}
