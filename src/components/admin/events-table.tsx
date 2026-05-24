"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirmDelete } from "@/components/ui/confirm-dialog";
import { TableCheckbox } from "@/components/ui/table-checkbox";
import {
  EventBulkApproveBar,
  useBulkApproveEvents,
  usePendingEventSelection,
} from "@/components/admin/event-bulk-approve";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/admin/data-table";
import type { EventRow } from "@/lib/types/database";
import { EventReviewActions } from "@/components/admin/event-review-actions";

function statusBadgeVariant(status: string): "success" | "warning" | "danger" | "default" {
  if (status === "published") return "success";
  if (status === "cancelled") return "danger";
  if (status === "pending_review") return "warning";
  return "default";
}

export function EventsTable({ events }: { events: EventRow[] }) {
  const router = useRouter();
  const confirmDelete = useConfirmDelete();
  const [busy, setBusy] = useState<string | null>(null);
  const selection = usePendingEventSelection(events);
  const bulk = useBulkApproveEvents(selection.clearSelection);

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

  const isRowBusy = (id: string) => busy === id || bulk.busy;
  const hasPending = selection.pendingIds.length > 0;

  return (
    <>
      <EventBulkApproveBar
        pendingCount={selection.pendingIds.length}
        selectedCount={selection.selectedCount}
        allPendingSelected={selection.allPendingSelected}
        busy={bulk.busy}
        onSelectAll={selection.toggleAll}
        onApprove={() => bulk.approveSelected([...selection.selected])}
        onClear={selection.clearSelection}
      />

      {!hasPending && (
        <p className="mb-4 text-sm text-wtva-muted">
          Bulk approve checkboxes appear when events are in{" "}
          <span className="text-amber-300">pending_review</span> status.
        </p>
      )}

      <DataTable>
        <DataTableHead>
          <tr>
            <DataTableHeaderCell className="w-12">
              {hasPending ? (
                <TableCheckbox
                  checked={selection.allPendingSelected}
                  onChange={(e) => selection.toggleAll(e.target.checked)}
                  aria-label="Select all pending events"
                />
              ) : (
                <span className="sr-only">Select</span>
              )}
            </DataTableHeaderCell>
            <DataTableHeaderCell>Title</DataTableHeaderCell>
            <DataTableHeaderCell>Venue</DataTableHeaderCell>
            <DataTableHeaderCell>Starts</DataTableHeaderCell>
            <DataTableHeaderCell>Status</DataTableHeaderCell>
            <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {events.map((e) => {
            const pending = e.status === "pending_review";
            return (
              <DataTableRow key={e.id}>
                <DataTableCell>
                  <TableCheckbox
                    checked={selection.selected.has(e.id)}
                    disabled={!pending || isRowBusy(e.id)}
                    onChange={(ev) => selection.toggleOne(e.id, ev.target.checked)}
                    aria-label={pending ? `Select ${e.title}` : `${e.title} is not pending review`}
                    title={
                      pending
                        ? "Select for bulk approve"
                        : "Only pending_review events can be selected"
                    }
                  />
                </DataTableCell>
                <DataTableCell>
                  <Link href={`/events/${e.id}/edit`} className="font-medium hover:underline">
                    {e.title}
                  </Link>
                  {e.featured && <Badge className="ml-2" variant="warning">Featured</Badge>}
                </DataTableCell>
                <DataTableCell>{e.venue?.name ?? "—"}</DataTableCell>
                <DataTableCell>{new Date(e.starts_at).toLocaleString()}</DataTableCell>
                <DataTableCell>
                  <Badge variant={statusBadgeVariant(e.status)}>{e.status}</Badge>
                </DataTableCell>
                <DataTableCell className="text-right">
                  {pending && (
                    <div className="mb-2">
                      <EventReviewActions eventId={e.id} disabled={isRowBusy(e.id)} compact />
                    </div>
                  )}
                  <Link href={`/events/${e.id}/edit`}>
                    <Button variant="ghost" className="px-2 py-1 text-xs">Edit</Button>
                  </Link>
                  <Button
                    variant="danger"
                    className="ml-2 px-2 py-1 text-xs"
                    disabled={isRowBusy(e.id)}
                    onClick={() => remove(e.id, e.title)}
                  >
                    Delete
                  </Button>
                </DataTableCell>
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>
    </>
  );
}
