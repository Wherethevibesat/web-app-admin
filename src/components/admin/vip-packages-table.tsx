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
import { formatCurrency } from "@/lib/utils";
import type { VipPackageRow } from "@/lib/types/database";

export function VipPackagesTable({ packages }: { packages: VipPackageRow[] }) {
  const router = useRouter();
  const confirmDelete = useConfirmDelete();
  const [busy, setBusy] = useState<string | null>(null);

  async function remove(id: string, name: string) {
    if (!(await confirmDelete(name))) return;
    setBusy(id);
    await fetch(`/api/admin/vip-packages/${id}`, { method: "DELETE" });
    setBusy(null);
    router.refresh();
  }

  if (packages.length === 0) {
    return <p className="text-wtva-muted">No VIP packages yet.</p>;
  }

  return (
    <DataTable>
      <DataTableHead>
        <tr>
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
              <Button variant="danger" className="ml-2 px-2 py-1 text-xs" disabled={busy === p.id} onClick={() => remove(p.id, p.package_name)}>
                Delete
              </Button>
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
