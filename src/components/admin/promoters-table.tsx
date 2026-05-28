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
import { ImpersonateButton } from "@/components/admin/impersonate-button";
import type { PromoterLinkSubmission } from "@/lib/admin/promoters";

function statusVariant(status: string) {
  if (status === "approved") return "success" as const;
  if (status === "pending") return "warning" as const;
  return "default" as const;
}

export function PromotersTable({ links }: { links: PromoterLinkSubmission[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const ids = links.map((l) => l.id);
  const selection = useTableSelection(ids);
  const bulk = useBulkRequest(selection.clearSelection);

  async function review(id: string, status: "approved" | "rejected") {
    setBusy(id);
    await fetch(`/api/admin/promoter-links/${id}/patch`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(null);
    router.refresh();
  }

  const rowBusy = (id: string) => busy === id || bulk.busy;

  if (links.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-wtva-dark-300 p-8 text-center text-wtva-muted">
        No promoter venue links yet. Pending requests appear under{" "}
        <Link href="/submissions?tab=promoters" className="underline">
          Submissions
        </Link>
        .
      </p>
    );
  }

  return (
    <>
      <BulkActionBar
        itemLabel="links"
        totalCount={links.length}
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
            bulk.post("/api/admin/promoter-links/bulk", {
              ids: selection.selectedIds,
              action: "approve",
            })
          }
        >
          Approve
        </Button>
        <Button
          variant="secondary"
          className="px-3 py-1 text-xs"
          disabled={bulk.busy}
          onClick={() =>
            bulk.post("/api/admin/promoter-links/bulk", {
              ids: selection.selectedIds,
              action: "reject",
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
            <DataTableHeaderCell>Promoter</DataTableHeaderCell>
            <DataTableHeaderCell>Venue</DataTableHeaderCell>
            <DataTableHeaderCell>Status</DataTableHeaderCell>
            <DataTableHeaderCell>Requested</DataTableHeaderCell>
            <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {links.map((l) => (
            <DataTableRow key={l.id}>
              <SelectRowCell
                id={l.id}
                label={l.promoter?.name ?? l.id}
                checked={selection.selected.has(l.id)}
                disabled={rowBusy(l.id)}
                onChange={selection.toggleOne}
              />
              <DataTableCell>
                <p className="font-medium">{l.promoter?.name ?? "-"}</p>
                {l.promoter?.email && (
                  <p className="text-xs text-wtva-muted">{l.promoter.email}</p>
                )}
              </DataTableCell>
              <DataTableCell>{l.venue?.name ?? l.venue_id}</DataTableCell>
              <DataTableCell>
                <Badge variant={statusVariant(l.status)} className="capitalize">
                  {l.status}
                </Badge>
              </DataTableCell>
              <DataTableCell>
                {new Date(l.requested_at).toLocaleDateString()}
              </DataTableCell>
              <DataTableCell className="text-right">
                <div className="flex flex-wrap justify-end gap-2">
                  <ImpersonateButton userId={l.promoter_id} />
                  {l.status === "pending" ? (
                    <>
                      <Button
                        disabled={rowBusy(l.id)}
                        className="px-3 py-1 text-xs"
                        onClick={() => review(l.id, "approved")}
                      >
                        Approve
                      </Button>
                      <Button
                        disabled={rowBusy(l.id)}
                        variant="ghost"
                        className="px-3 py-1 text-xs"
                        onClick={() => review(l.id, "rejected")}
                      >
                        Reject
                      </Button>
                    </>
                  ) : null}
                </div>
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    </>
  );
}
