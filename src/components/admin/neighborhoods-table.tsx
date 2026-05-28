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
import type { NeighborhoodRow } from "@/lib/types/neighborhood";

export function NeighborhoodsTable({ neighborhoods }: { neighborhoods: NeighborhoodRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const ids = neighborhoods.map((n) => n.id);
  const selection = useTableSelection(ids);
  const bulk = useBulkRequest(selection.clearSelection);

  const rowBusy = (id: string) => busy === id || bulk.busy;

  if (neighborhoods.length === 0) {
    return <p className="text-wtva-muted">No neighborhoods yet. Add one to get started.</p>;
  }

  return (
    <>
      <BulkActionBar
        itemLabel="neighborhoods"
        totalCount={neighborhoods.length}
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
            bulk.post("/api/admin/neighborhoods/bulk", {
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
            bulk.post("/api/admin/neighborhoods/bulk", {
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
              "/api/admin/neighborhoods/bulk",
              { ids: selection.selectedIds, action: "delete" },
              {
                useDeleteConfirm: true,
                itemName: `${selection.selectedCount} neighborhoods`,
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
            <DataTableHeaderCell>Name</DataTableHeaderCell>
            <DataTableHeaderCell>Slug</DataTableHeaderCell>
            <DataTableHeaderCell>Order</DataTableHeaderCell>
            <DataTableHeaderCell>Status</DataTableHeaderCell>
            <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {neighborhoods.map((n) => (
            <DataTableRow key={n.id}>
              <SelectRowCell
                id={n.id}
                label={n.name}
                checked={selection.selected.has(n.id)}
                disabled={rowBusy(n.id)}
                onChange={selection.toggleOne}
              />
              <DataTableCell>
                <Link href={`/neighborhoods/${n.id}/edit`} className="font-medium hover:underline">
                  {n.name}
                </Link>
                {n.description && (
                  <p className="mt-0.5 text-xs text-wtva-muted line-clamp-1">{n.description}</p>
                )}
              </DataTableCell>
              <DataTableCell className="font-mono text-xs text-wtva-muted">{n.slug}</DataTableCell>
              <DataTableCell>{n.sort_order}</DataTableCell>
              <DataTableCell>
                <Badge variant={n.is_active ? "success" : "default"}>
                  {n.is_active ? "Active" : "Inactive"}
                </Badge>
              </DataTableCell>
              <DataTableCell className="text-right">
                <Link href={`/neighborhoods/${n.id}/edit`}>
                  <Button variant="ghost" className="px-2 py-1 text-xs">
                    Edit
                  </Button>
                </Link>
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    </>
  );
}
