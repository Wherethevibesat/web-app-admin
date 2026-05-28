import Link from "next/link";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/admin/data-table";
import type { UserProfile } from "@/lib/types/database";

export function CustomersTable({ customers }: { customers: UserProfile[] }) {
  if (customers.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-wtva-dark-300 p-8 text-center text-wtva-muted">
        No customers found.
      </p>
    );
  }

  return (
    <DataTable>
      <DataTableHead>
        <tr>
          <DataTableHeaderCell>Name</DataTableHeaderCell>
          <DataTableHeaderCell>Email</DataTableHeaderCell>
          <DataTableHeaderCell>Joined</DataTableHeaderCell>
          <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell>
        </tr>
      </DataTableHead>
      <DataTableBody>
        {customers.map((c) => (
          <DataTableRow key={c.id}>
            <DataTableCell className="font-medium">{c.name}</DataTableCell>
            <DataTableCell>{c.email}</DataTableCell>
            <DataTableCell className="text-wtva-muted">
              {new Date(c.created_at).toLocaleDateString()}
            </DataTableCell>
            <DataTableCell className="text-right">
              <Link
                href={`/users/${c.id}/edit`}
                className="inline-flex items-center rounded-lg border border-wtva-dark-300 px-3 py-1 text-xs font-semibold hover:border-wtva-muted"
              >
                View user
              </Link>
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
