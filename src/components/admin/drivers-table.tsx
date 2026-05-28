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
import type { DriverCompanyRow } from "@/lib/admin/drivers";

function listingLabel(expiresAt: string | null, published: boolean) {
  if (!published) return "Not live";
  if (!expiresAt) return "Live";
  const exp = new Date(expiresAt);
  if (exp.getTime() <= Date.now()) return "Expired";
  return `Until ${exp.toLocaleDateString()}`;
}

export function DriversTable({ drivers }: { drivers: DriverCompanyRow[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [busy, setBusy] = useState<string | null>(null);
  const ids = drivers.map((d) => d.id);
  const selection = useTableSelection(ids);
  const bulk = useBulkRequest(selection.clearSelection);

  async function patchDriver(id: string, patch: Record<string, unknown>) {
    setBusy(id);
    await fetch(`/api/admin/drivers/${id}/patch`, {
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
        title: "Deactivate driver listing?",
        description: `"${name}" will be hidden from customers.`,
        confirmLabel: "Deactivate",
        variant: "danger",
      });
      if (!ok) return;
      await patchDriver(id, { published: false, status: "suspended" });
      return;
    }
    await patchDriver(id, { published: true, status: "published" });
  }

  const rowBusy = (id: string) => busy === id || bulk.busy;

  if (drivers.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-wtva-dark-300 p-8 text-center text-wtva-muted">
        No driver companies found. Pending listings appear under{" "}
        <Link href="/submissions?tab=drivers" className="underline">
          Submissions
        </Link>
        .
      </p>
    );
  }

  return (
    <>
      <BulkActionBar
        itemLabel="drivers"
        totalCount={drivers.length}
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
            bulk.post("/api/admin/drivers/bulk", {
              ids: selection.selectedIds,
              action: "publish",
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
            bulk.post(
              "/api/admin/drivers/bulk",
              { ids: selection.selectedIds, action: "unpublish" },
              {
                confirm: {
                  title: "Deactivate selected drivers?",
                  variant: "danger",
                  confirmLabel: "Deactivate",
                },
              },
            )
          }
        >
          Deactivate
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
            <DataTableHeaderCell>Company</DataTableHeaderCell>
            <DataTableHeaderCell>City</DataTableHeaderCell>
            <DataTableHeaderCell>Status</DataTableHeaderCell>
            <DataTableHeaderCell>Listing</DataTableHeaderCell>
            <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {drivers.map((d) => (
            <DataTableRow key={d.id}>
              <SelectRowCell
                id={d.id}
                label={d.company_name}
                checked={selection.selected.has(d.id)}
                disabled={rowBusy(d.id)}
                onChange={selection.toggleOne}
              />
              <DataTableCell>
                <p className="font-medium">{d.company_name}</p>
                {d.contact_email && (
                  <p className="text-xs text-wtva-muted">{d.contact_email}</p>
                )}
              </DataTableCell>
              <DataTableCell>{d.city ?? "-"}</DataTableCell>
              <DataTableCell>
                <Badge variant={d.published ? "success" : d.status === "pending_review" ? "warning" : "default"}>
                  {d.status.replace("_", " ")}
                </Badge>
              </DataTableCell>
              <DataTableCell className="text-sm text-wtva-muted">
                {listingLabel(d.listing_expires_at, d.published)}
              </DataTableCell>
              <DataTableCell className="text-right">
                <div className="flex flex-wrap justify-end gap-2">
                  {d.owner_id && <ImpersonateButton userId={d.owner_id} />}
                  {d.status === "pending_review" ? (
                    <Button
                      disabled={rowBusy(d.id)}
                      className="px-3 py-1 text-xs"
                      onClick={() => patchDriver(d.id, { published: true, status: "published" })}
                    >
                      Approve
                    </Button>
                  ) : d.published ? (
                    <Button
                      disabled={rowBusy(d.id)}
                      variant="secondary"
                      className="px-3 py-1 text-xs"
                      onClick={() => setPublished(d.id, d.company_name, false)}
                    >
                      Deactivate
                    </Button>
                  ) : (
                    <Button
                      disabled={rowBusy(d.id)}
                      className="px-3 py-1 text-xs"
                      onClick={() => setPublished(d.id, d.company_name, true)}
                    >
                      Activate
                    </Button>
                  )}
                </div>
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    </>
  );
}
