"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useConfirmDelete } from "@/components/ui/confirm-dialog";
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
  const confirm = useConfirm();
  const confirmDelete = useConfirmDelete();
  const [busy, setBusy] = useState<string | null>(null);
  const ids = events.map((e) => e.id);
  const selection = useTableSelection(ids);
  const bulk = useBulkRequest(selection.clearSelection);

  async function remove(id: string, title: string) {
    if (!(await confirmDelete(title))) return;
    setBusy(id);
    await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
    setBusy(null);
    router.refresh();
  }

  async function activatePaidFeature(id: string, title: string) {
    const ok = await confirm({
      title: "Activate paid homepage feature?",
      description:
        `Charge and activate homepage featured slot for "${title}" using current settings.`,
      confirmLabel: "Activate",
    });
    if (!ok) return;
    setBusy(id);
    const res = await fetch(`/api/admin/events/${id}/feature`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "activate_paid" }),
    });
    setBusy(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Activation failed");
      return;
    }
    router.refresh();
  }

  async function deactivateFeature(id: string) {
    setBusy(id);
    const res = await fetch(`/api/admin/events/${id}/feature`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deactivate" }),
    });
    setBusy(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Update failed");
      return;
    }
    router.refresh();
  }

  if (events.length === 0) {
    return <p className="text-wtva-muted">No events yet. Create one to get started.</p>;
  }

  const rowBusy = (id: string) => busy === id || bulk.busy;

  return (
    <>
      <BulkActionBar
        itemLabel="events"
        totalCount={events.length}
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
            bulk.post(
              "/api/admin/events/bulk-status",
              { ids: selection.selectedIds, status: "published" },
              {
                confirm: {
                  title: `Publish ${selection.selectedCount} event(s)?`,
                  confirmLabel: "Publish",
                },
              },
            )
          }
        >
          Publish
        </Button>
        <Button
          variant="secondary"
          className="px-3 py-1 text-xs"
          disabled={bulk.busy}
          onClick={() =>
            bulk.post(
              "/api/admin/events/bulk-status",
              { ids: selection.selectedIds, status: "cancelled" },
              {
                confirm: {
                  title: `Cancel ${selection.selectedCount} event(s)?`,
                  variant: "danger",
                  confirmLabel: "Cancel events",
                },
              },
            )
          }
        >
          Cancel
        </Button>
        <Button
          variant="danger"
          className="px-3 py-1 text-xs"
          disabled={bulk.busy}
          onClick={() =>
            bulk.post(
              "/api/admin/events/bulk-delete",
              { ids: selection.selectedIds },
              { useDeleteConfirm: true, itemName: `${selection.selectedCount} events` },
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
                <SelectRowCell
                  id={e.id}
                  label={e.title}
                  checked={selection.selected.has(e.id)}
                  disabled={rowBusy(e.id)}
                  onChange={selection.toggleOne}
                />
                <DataTableCell>
                  <Link href={`/events/${e.id}/edit`} className="font-medium hover:underline">
                    {e.title}
                  </Link>
                  {e.featured && <Badge className="ml-2" variant="warning">Featured</Badge>}
                  {e.homepage_featured && (
                    <Badge className="ml-2" variant="success">
                      Homepage Featured
                    </Badge>
                  )}
                </DataTableCell>
                <DataTableCell>{e.venue?.name ?? "—"}</DataTableCell>
                <DataTableCell>{new Date(e.starts_at).toLocaleString()}</DataTableCell>
                <DataTableCell>
                  <Badge variant={statusBadgeVariant(e.status)}>{e.status}</Badge>
                </DataTableCell>
                <DataTableCell className="text-right">
                  {pending && (
                    <div className="mb-2">
                      <EventReviewActions eventId={e.id} disabled={rowBusy(e.id)} compact />
                    </div>
                  )}
                  <Link href={`/events/${e.id}/edit`}>
                    <Button variant="ghost" className="px-2 py-1 text-xs">Edit</Button>
                  </Link>
                  {e.homepage_featured ? (
                    <Button
                      variant="secondary"
                      className="ml-2 px-2 py-1 text-xs"
                      disabled={rowBusy(e.id)}
                      onClick={() => deactivateFeature(e.id)}
                    >
                      Remove homepage feature
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      className="ml-2 px-2 py-1 text-xs"
                      disabled={rowBusy(e.id)}
                      onClick={() => activatePaidFeature(e.id, e.title)}
                    >
                      Activate paid homepage feature
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    className="ml-2 px-2 py-1 text-xs"
                    disabled={rowBusy(e.id)}
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
