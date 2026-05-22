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
import type { EventRow } from "@/lib/types/database";

export function EventsTable({ events }: { events: EventRow[] }) {
  const router = useRouter();
  const confirmDelete = useConfirmDelete();
  const [busy, setBusy] = useState<string | null>(null);

  async function remove(id: string, title: string) {
    if (!(await confirmDelete(title))) return;
    setBusy(id);
    await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
    setBusy(null);
    router.refresh();
  }

  if (events.length === 0) {
    return <p className="text-wtva-muted">No events yet. Create one to get started.</p>;
  }

  return (
    <DataTable>
      <DataTableHead>
        <tr>
          <DataTableHeaderCell>Title</DataTableHeaderCell>
          <DataTableHeaderCell>Venue</DataTableHeaderCell>
          <DataTableHeaderCell>Starts</DataTableHeaderCell>
          <DataTableHeaderCell>Status</DataTableHeaderCell>
          <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell>
        </tr>
      </DataTableHead>
      <DataTableBody>
        {events.map((e) => (
          <DataTableRow key={e.id}>
            <DataTableCell>
              <Link href={`/events/${e.id}/edit`} className="font-medium hover:underline">
                {e.title}
              </Link>
              {e.featured && <Badge className="ml-2" variant="warning">Featured</Badge>}
            </DataTableCell>
            <DataTableCell>{e.venue?.name ?? "—"}</DataTableCell>
            <DataTableCell>{new Date(e.starts_at).toLocaleString()}</DataTableCell>
            <DataTableCell>
              <Badge variant={e.status === "published" ? "success" : "warning"}>{e.status}</Badge>
            </DataTableCell>
            <DataTableCell className="text-right">
              <Link href={`/events/${e.id}/edit`}>
                <Button variant="ghost" className="px-2 py-1 text-xs">Edit</Button>
              </Link>
              <Button variant="danger" className="ml-2 px-2 py-1 text-xs" disabled={busy === e.id} onClick={() => remove(e.id, e.title)}>
                Delete
              </Button>
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
