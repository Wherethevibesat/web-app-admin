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
import { formatCurrency } from "@/lib/utils";
import { listTransactions } from "@/lib/admin/stripe";
import { requireAdminPage } from "@/lib/admin/require-admin-page";

export default async function EarningsPage() {
  await requireAdminPage("earnings");
  let total = 0;
  let pending = 0;
  let rows: Awaited<ReturnType<typeof listTransactions>> = [];
  let error: string | null = null;

  try {
    rows = await listTransactions(50);
    total = rows
      .filter((t) => t.status === "completed")
      .reduce((s, t) => s + Number(t.amount), 0);
    pending = rows.filter((t) => t.status === "pending").length;
  } catch (e) {
    error =
      e instanceof Error
        ? e.message
        : "Run migrations 004 and 005 in Supabase SQL Editor";
  }

  return (
    <div>
      <PageHeader
        title="Earnings"
        description="Platform revenue and transaction history."
      >
        <Link href="/earnings/withdraw">
          <span className="rounded-full bg-accent-gradient shadow-accent px-4 py-2 text-sm font-semibold text-white">
            Withdraw
          </span>
        </Link>
      </PageHeader>

      {error ? (
        <p className="text-amber-400">{error}</p>
      ) : (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-wtva-dark-300 bg-wtva-card p-6">
              <p className="text-sm text-wtva-muted">Total revenue</p>
              <p className="text-3xl font-bold">{formatCurrency(total)}</p>
            </div>
            <div className="rounded-xl border border-wtva-dark-300 bg-wtva-card p-6">
              <p className="text-sm text-wtva-muted">Pending payments</p>
              <p className="text-3xl font-bold">{pending}</p>
            </div>
            <div className="rounded-xl border border-wtva-dark-300 bg-wtva-card p-6">
              <p className="text-sm text-wtva-muted">Transactions</p>
              <p className="text-3xl font-bold">{rows.length}</p>
            </div>
          </div>

          <h2 className="mb-4 text-lg font-bold">Recent transactions</h2>
          {rows.length === 0 ? (
            <p className="text-wtva-muted">No transactions yet.</p>
          ) : (
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableHeaderCell>Type</DataTableHeaderCell>
                  <DataTableHeaderCell>Description</DataTableHeaderCell>
                  <DataTableHeaderCell>Amount</DataTableHeaderCell>
                  <DataTableHeaderCell>Status</DataTableHeaderCell>
                  <DataTableHeaderCell>Date</DataTableHeaderCell>
                </tr>
              </DataTableHead>
              <DataTableBody>
                {rows.map((t) => (
                  <DataTableRow key={t.id}>
                    <DataTableCell>{t.type}</DataTableCell>
                    <DataTableCell>{t.description ?? "—"}</DataTableCell>
                    <DataTableCell>{formatCurrency(Number(t.amount))}</DataTableCell>
                    <DataTableCell>
                      <Badge
                        variant={
                          t.status === "completed"
                            ? "success"
                            : t.status === "pending"
                              ? "warning"
                              : "danger"
                        }
                      >
                        {t.status}
                      </Badge>
                    </DataTableCell>
                    <DataTableCell className="text-wtva-muted">
                      {new Date(t.created_at).toLocaleString()}
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          )}
        </>
      )}
    </div>
  );
}
