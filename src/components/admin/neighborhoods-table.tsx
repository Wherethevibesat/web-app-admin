"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirmDelete } from "@/components/ui/confirm-dialog";
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
  const confirmDelete = useConfirmDelete();
  const [busy, setBusy] = useState<string | null>(null);

  async function remove(id: string, name: string) {
    if (!(await confirmDelete(name))) return;
    setBusy(id);
    const res = await fetch(`/api/admin/neighborhoods/${id}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Failed to delete neighborhood");
      return;
    }
    router.refresh();
  }

  if (neighborhoods.length === 0) {
    return <p className="text-wtva-muted">No neighborhoods yet. Add one to get started.</p>;
  }

  return (
    <DataTable>
      <DataTableHead>
        <tr>
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
              <Button
                variant="danger"
                className="ml-2 px-2 py-1 text-xs"
                disabled={busy === n.id}
                onClick={() => remove(n.id, n.name)}
              >
                Delete
              </Button>
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
