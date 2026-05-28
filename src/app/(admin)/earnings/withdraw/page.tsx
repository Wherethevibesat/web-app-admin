import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { WithdrawForm } from "@/components/admin/withdraw-form";
import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/admin/data-table";
import { formatCurrency } from "@/lib/utils";
import { listWithdrawals } from "@/lib/admin/stripe";
import { requireAdminPage } from "@/lib/admin/require-admin-page";

export default async function WithdrawPage() {
  await requireAdminPage("earnings");
  const withdrawals = await listWithdrawals().catch(() => []);

  return (
    <div>
      <PageHeader title="Withdraw" description="Request platform payouts.">
        <Link href="/earnings" className="text-sm text-wtva-muted underline">
          Back to earnings
        </Link>
      </PageHeader>

      <div className="grid gap-8 lg:grid-cols-2">
        <WithdrawForm />

        <div>
          <h2 className="mb-4 text-lg font-bold">Withdrawal history</h2>
          {withdrawals.length === 0 ? (
            <p className="text-wtva-muted">No withdrawals yet.</p>
          ) : (
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell>Amount</DataTableHeaderCell>
                  <DataTableHeaderCell>Status</DataTableHeaderCell>
                  <DataTableHeaderCell>Date</DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <DataTableBody>
                {withdrawals.map((w) => (
                  <DataTableRow key={w.id}>
                    <DataTableCell>{formatCurrency(Number(w.amount))}</DataTableCell>
                    <DataTableCell>
                      <Badge variant={w.status === "completed" ? "success" : "warning"}>
                        {w.status}
                      </Badge>
                    </DataTableCell>
                    <DataTableCell className="text-wtva-muted">
                      {new Date(w.created_at).toLocaleDateString()}
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          )}
        </div>
      </div>
    </div>
  );
}
