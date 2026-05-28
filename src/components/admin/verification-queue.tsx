"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { ImpersonateButton } from "@/components/admin/impersonate-button";
import type { VenueRow } from "@/lib/types/venue";

export function VerificationQueue({ venues }: { venues: VenueRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const ids = venues.map((v) => v.id);
  const selection = useTableSelection(ids);
  const bulk = useBulkRequest(selection.clearSelection);

  async function review(id: string, status: "approved" | "rejected") {
    setBusy(id);
    await fetch(`/api/admin/venues/${id}/verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(null);
    router.refresh();
  }

  async function viewDocument(venueId: string) {
    const res = await fetch(`/api/admin/verification/${venueId}/document`);
    const body = await res.json().catch(() => ({}));
    if (body.url) window.open(body.url, "_blank");
    else alert(body.error ?? "Could not open document");
  }

  const rowBusy = (id: string) => busy === id || bulk.busy;

  if (venues.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-wtva-dark-300 p-8 text-center text-wtva-muted">
        No pending verification documents.
      </p>
    );
  }

  return (
    <>
      <BulkActionBar
        itemLabel="venues"
        totalCount={venues.length}
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
            bulk.post("/api/admin/venues/bulk", {
              ids: selection.selectedIds,
              action: "verify_approve",
            })
          }
        >
          Approve
        </Button>
        <Button
          variant="danger"
          className="px-3 py-1 text-xs"
          disabled={bulk.busy}
          onClick={() =>
            bulk.post("/api/admin/venues/bulk", {
              ids: selection.selectedIds,
              action: "verify_reject",
            })
          }
        >
          Reject
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
            <DataTableHeaderCell>Venue</DataTableHeaderCell>
            <DataTableHeaderCell>Type</DataTableHeaderCell>
            <DataTableHeaderCell>Document</DataTableHeaderCell>
            <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {venues.map((v) => (
            <DataTableRow key={v.id}>
              <SelectRowCell
                id={v.id}
                label={v.name}
                checked={selection.selected.has(v.id)}
                disabled={rowBusy(v.id)}
                onChange={selection.toggleOne}
              />
              <DataTableCell className="font-medium">{v.name}</DataTableCell>
              <DataTableCell>{v.venue_type}</DataTableCell>
              <DataTableCell>
                {v.verification_document_path ? (
                  <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => viewDocument(v.id)}>
                    View file
                  </Button>
                ) : (
                  <span className="text-wtva-subtle">No file</span>
                )}
              </DataTableCell>
              <DataTableCell className="text-right">
                <div className="flex flex-wrap justify-end gap-2">
                  {v.owner_id ? (
                    <ImpersonateButton userId={v.owner_id} label="Login as owner" />
                  ) : null}
                  <Button
                    className="px-3 py-1 text-xs"
                    disabled={rowBusy(v.id)}
                    onClick={() => review(v.id, "approved")}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="danger"
                    className="px-3 py-1 text-xs"
                    disabled={rowBusy(v.id)}
                    onClick={() => review(v.id, "rejected")}
                  >
                    Reject
                  </Button>
                </div>
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    </>
  );
}
