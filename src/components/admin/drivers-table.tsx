"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/admin/data-table";
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
        description: `"${name}" will be hidden from customers. The owner can still manage it in the driver portal.`,
        confirmLabel: "Deactivate",
        variant: "danger",
      });
      if (!ok) return;
      await patchDriver(id, { published: false, status: "suspended" });
      return;
    }
    await patchDriver(id, { published: true, status: "published" });
  }

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
    <DataTable>
      <DataTableHead>
        <tr>
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
              {d.status === "pending_review" ? (
                <Button
                  disabled={busy === d.id}
                  className="px-3 py-1 text-xs"
                  onClick={() => patchDriver(d.id, { published: true, status: "published" })}
                >
                  Approve
                </Button>
              ) : d.published ? (
                <Button
                  disabled={busy === d.id}
                  variant="secondary"
                  className="px-3 py-1 text-xs"
                  onClick={() => setPublished(d.id, d.company_name, false)}
                >
                  Deactivate
                </Button>
              ) : (
                <Button
                  disabled={busy === d.id}
                  className="px-3 py-1 text-xs"
                  onClick={() => setPublished(d.id, d.company_name, true)}
                >
                  Activate
                </Button>
              )}
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
