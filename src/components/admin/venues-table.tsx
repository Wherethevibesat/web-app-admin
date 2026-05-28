"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
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

function listingLabel(expiresAt: string | null | undefined, published: boolean | null | undefined) {
  if (published === false) return "Not live";
  if (!expiresAt) return published ? "Live" : "Not paid";
  const exp = new Date(expiresAt);
  if (exp.getTime() <= Date.now()) return "Expired";
  return `Until ${exp.toLocaleDateString()}`;
}

export function VenuesTable({ venues }: { venues: VenueRow[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [busy, setBusy] = useState<string | null>(null);
  const ids = venues.map((v) => v.id);
  const selection = useTableSelection(ids);
  const bulk = useBulkRequest(selection.clearSelection);

  async function patchVenue(id: string, patch: Record<string, unknown>) {
    setBusy(id);
    await fetch(`/api/admin/venues/${id}/patch`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setBusy(null);
    router.refresh();
  }

  async function setPublished(id: string, name: string, published: boolean) {
    if (!published) {
      const ok = await confirm({
        title: "Deactivate venue?",
        description: `"${name}" will be hidden from customers.`,
        confirmLabel: "Deactivate",
        variant: "danger",
      });
      if (!ok) return;
    }
    await patchVenue(id, { published });
  }

  const rowBusy = (id: string) => busy === id || bulk.busy;

  if (venues.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-wtva-dark-300 p-8 text-center text-wtva-muted">
        No venues found.
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
            bulk.post(
              "/api/admin/venues/bulk",
              { ids: selection.selectedIds, action: "publish" },
              { confirm: { title: "Activate selected venues?", confirmLabel: "Activate" } },
            )
          }
        >
          Activate
        </Button>
        <Button
          variant="secondary"
          className="px-3 py-1 text-xs"
          disabled={bulk.busy}
          onClick={() =>
            bulk.post(
              "/api/admin/venues/bulk",
              { ids: selection.selectedIds, action: "unpublish" },
              {
                confirm: {
                  title: "Deactivate selected venues?",
                  variant: "danger",
                  confirmLabel: "Deactivate",
                },
              },
            )
          }
        >
          Deactivate
        </Button>
        <Button
          variant="ghost"
          className="px-3 py-1 text-xs"
          disabled={bulk.busy}
          onClick={() =>
            bulk.post("/api/admin/venues/bulk", {
              ids: selection.selectedIds,
              action: "feature",
            })
          }
        >
          Feature
        </Button>
        <Button
          variant="ghost"
          className="px-3 py-1 text-xs"
          disabled={bulk.busy}
          onClick={() =>
            bulk.post("/api/admin/venues/bulk", {
              ids: selection.selectedIds,
              action: "unfeature",
            })
          }
        >
          Unfeature
        </Button>
        <Button
          variant="danger"
          className="px-3 py-1 text-xs"
          disabled={bulk.busy}
          onClick={() =>
            bulk.post(
              "/api/admin/venues/bulk",
              { ids: selection.selectedIds, action: "delete" },
              { useDeleteConfirm: true, itemName: `${selection.selectedCount} venues` },
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
              label="Select all venues"
            />
            <DataTableHeaderCell>Name</DataTableHeaderCell>
            <DataTableHeaderCell>Type</DataTableHeaderCell>
            <DataTableHeaderCell>Area</DataTableHeaderCell>
            <DataTableHeaderCell>Tier</DataTableHeaderCell>
            <DataTableHeaderCell>Status</DataTableHeaderCell>
            <DataTableHeaderCell>Listing</DataTableHeaderCell>
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
              <DataTableCell>
                <Link href={`/venues/${v.id}/edit`} className="font-medium hover:underline">
                  {v.name}
                </Link>
                {v.featured && (
                  <Badge className="ml-2" variant="warning">
                    Featured
                  </Badge>
                )}
              </DataTableCell>
              <DataTableCell>{v.venue_type}</DataTableCell>
              <DataTableCell>{v.neighborhood ?? "—"}</DataTableCell>
              <DataTableCell className="capitalize">{v.subscription_tier ?? "—"}</DataTableCell>
              <DataTableCell>
                <div className="flex flex-wrap gap-1">
                  {v.verified && <Badge variant="success">Verified</Badge>}
                  {v.verification_status === "pending" && (
                    <Badge variant="warning">Pending doc</Badge>
                  )}
                  {v.published === false && <Badge variant="danger">Deactivated</Badge>}
                </div>
              </DataTableCell>
              <DataTableCell className="text-sm text-wtva-muted">
                {listingLabel(v.listing_expires_at, v.published)}
              </DataTableCell>
              <DataTableCell className="text-right">
                <div className="flex flex-wrap justify-end gap-2">
                  {v.owner_id ? (
                    <ImpersonateButton userId={v.owner_id} label="Login as owner" />
                  ) : null}
                  {v.published !== false ? (
                    <Button
                      variant="ghost"
                      className="px-2 py-1 text-xs"
                      disabled={rowBusy(v.id)}
                      onClick={() => setPublished(v.id, v.name, false)}
                    >
                      Deactivate
                    </Button>
                  ) : (
                    <Button
                      className="px-2 py-1 text-xs"
                      disabled={rowBusy(v.id)}
                      onClick={() => setPublished(v.id, v.name, true)}
                    >
                      Activate
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    className="px-2 py-1 text-xs"
                    disabled={rowBusy(v.id)}
                    onClick={() => patchVenue(v.id, { featured: !v.featured })}
                  >
                    {v.featured ? "Unfeature" : "Feature"}
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
