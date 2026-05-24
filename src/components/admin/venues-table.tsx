"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirmDelete, useConfirm } from "@/components/ui/confirm-dialog";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/admin/data-table";
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
  const confirmDelete = useConfirmDelete();
  const confirm = useConfirm();
  const [busy, setBusy] = useState<string | null>(null);

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

  async function toggleFeatured(id: string, featured: boolean) {
    await patchVenue(id, { featured: !featured });
  }

  async function setPublished(id: string, name: string, published: boolean) {
    if (!published) {
      const ok = await confirm({
        title: "Deactivate venue?",
        description: `"${name}" will be hidden from customers. The owner can still manage it in the business portal.`,
        confirmLabel: "Deactivate",
        variant: "danger",
      });
      if (!ok) return;
    }
    await patchVenue(id, { published });
  }

  async function deleteVenue(id: string, name: string) {
    if (!(await confirmDelete(name))) return;
    setBusy(id);
    await fetch(`/api/admin/venues/${id}`, { method: "DELETE" });
    setBusy(null);
    router.refresh();
  }

  if (venues.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-wtva-dark-300 p-8 text-center text-wtva-muted">
        No venues found.
      </p>
    );
  }

  return (
    <DataTable>
      <DataTableHead>
        <tr>
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
                {v.published !== false ? (
                  <Button
                    variant="ghost"
                    className="px-2 py-1 text-xs"
                    disabled={busy === v.id}
                    onClick={() => setPublished(v.id, v.name, false)}
                  >
                    Deactivate
                  </Button>
                ) : (
                  <Button
                    className="px-2 py-1 text-xs"
                    disabled={busy === v.id}
                    onClick={() => setPublished(v.id, v.name, true)}
                  >
                    Activate
                  </Button>
                )}
                <Button
                  variant="ghost"
                  className="px-2 py-1 text-xs"
                  disabled={busy === v.id}
                  onClick={() => toggleFeatured(v.id, !!v.featured)}
                >
                  {v.featured ? "Unfeature" : "Feature"}
                </Button>
                <Button
                  variant="danger"
                  className="px-2 py-1 text-xs"
                  disabled={busy === v.id}
                  onClick={() => deleteVenue(v.id, v.name)}
                >
                  Delete
                </Button>
              </div>
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
