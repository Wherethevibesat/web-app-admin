"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BulkActionBar,
  SelectAllHeaderCell,
  SelectRowCell,
  useTableSelection,
} from "@/components/admin/table-selection";
import { useBulkRequest } from "@/components/admin/use-bulk-request";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/admin/data-table";
import { formatCurrency } from "@/lib/utils";
import type { VipPackageRow } from "@/lib/types/database";

export function VipPackagesTable({ packages }: { packages: VipPackageRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const ids = packages.map((p) => p.id);
  const selection = useTableSelection(ids);
  const bulk = useBulkRequest(selection.clearSelection);

  const rowBusy = (id: string) => busy === id || bulk.busy;

  if (packages.length === 0) {
    return <p className="text-wtva-muted">No VIP packages yet.</p>;
  }

  return (
    <>
      <BulkActionBar
        itemLabel="packages"
        totalCount={packages.length}
        selectedCount={selection.selectedCount}
        allSelected={selection.allSelected}
        busy={bulk.busy}
        onSelectAll={selection.toggleAll}
        onClear={selection.clearSelection}
      >
        <Button
          className="px-3 py-1 text-xs"
          disabled={bulk.busy}
          onClick={() =>
            bulk.post("/api/admin/vip-packages/bulk", {
              ids: selection.selectedIds,
              action: "activate",
            })
          }
        >
          Activate
        </Button>
        <Button
          variant="secondary"
          className="px-3 py-1 text-xs"
          disabled={bulk.busy}
          onClick={() =>
            bulk.post("/api/admin/vip-packages/bulk", {
              ids: selection.selectedIds,
              action: "deactivate",
            })
          }
        >
          Deactivate
        </Button>
        <Button
          variant="danger"
          className="px-3 py-1 text-xs"
          disabled={bulk.busy}
          onClick={() =>
            bulk.post(
              "/api/admin/vip-packages/bulk",
              { ids: selection.selectedIds, action: "delete" },
              {
                useDeleteConfirm: true,
                itemName: `${selection.selectedCount} VIP packages`,
              },
            )
          }
        >
          Delete
        </Button>
      </BulkActionBar>

      <DataTable>
        <DataTableHead>
          <tr>
            <SelectAllHeaderCell
              checked={selection.allSelected}
              disabled={bulk.busy}
              onChange={selection.toggleAll}
            />
            <DataTableHeaderCell>Package</DataTableHeaderCell>
            <DataTableHeaderCell>Venue</DataTableHeaderCell>
            <DataTableHeaderCell>Price</DataTableHeaderCell>
            <DataTableHeaderCell>Status</DataTableHeaderCell>
            <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {packages.map((p) => (
            <DataTableRow key={p.id}>
              <SelectRowCell
                id={p.id}
                label={p.package_name}
                checked={selection.selected.has(p.id)}
                disabled={rowBusy(p.id)}
                onChange={selection.toggleOne}
              />
              <DataTableCell>
                <Link href={`/vip-packages/${p.id}/edit`} className="font-medium hover:underline">
                  {p.package_name}
                </Link>
              </DataTableCell>
              <DataTableCell>{p.venue?.name ?? p.venue_id}</DataTableCell>
              <DataTableCell>{formatCurrency(Number(p.price))}</DataTableCell>
              <DataTableCell>
                <Badge variant={p.is_active ? "success" : "default"}>
                  {p.is_active ? "Active" : "Inactive"}
                </Badge>
              </DataTableCell>
              <DataTableCell className="text-right">
                <Link href={`/vip-packages/${p.id}/edit`}>
                  <Button variant="ghost" className="px-2 py-1 text-xs">Edit</Button>
                </Link>
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    </>
  );
}
