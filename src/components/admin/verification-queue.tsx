"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/admin/data-table";
import type { VenueRow } from "@/lib/types/venue";

export function VerificationQueue({ venues }: { venues: VenueRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

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

  if (venues.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-wtva-dark-300 p-8 text-center text-wtva-muted">
        No pending verification documents.
      </p>
    );
  }

  return (
    <DataTable>
      <DataTableHead>
        <tr>
          <DataTableHeaderCell>Venue</DataTableHeaderCell>
          <DataTableHeaderCell>Type</DataTableHeaderCell>
          <DataTableHeaderCell>Document</DataTableHeaderCell>
          <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell>
        </tr>
      </DataTableHead>
      <DataTableBody>
        {venues.map((v) => (
          <DataTableRow key={v.id}>
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
              <div className="flex justify-end gap-2">
                <Button className="px-3 py-1 text-xs" disabled={busy === v.id} onClick={() => review(v.id, "approved")}>
                  Approve
                </Button>
                <Button variant="danger" className="px-3 py-1 text-xs" disabled={busy === v.id} onClick={() => review(v.id, "rejected")}>
                  Reject
                </Button>
              </div>
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
