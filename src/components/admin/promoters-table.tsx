"use client";

import Link from "next/link";
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
import type { PromoterLinkSubmission } from "@/lib/admin/promoters";

function statusVariant(status: string) {
  if (status === "approved") return "success" as const;
  if (status === "pending") return "warning" as const;
  return "default" as const;
}

export function PromotersTable({ links }: { links: PromoterLinkSubmission[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

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
    <DataTable>
      <DataTableHead>
        <tr>
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
              {l.status === "pending" ? (
                <div className="flex justify-end gap-2">
                  <Button
                    disabled={busy === l.id}
                    className="px-3 py-1 text-xs"
                    onClick={() => review(l.id, "approved")}
                  >
                    Approve
                  </Button>
                  <Button
                    disabled={busy === l.id}
                    variant="ghost"
                    className="px-3 py-1 text-xs"
                    onClick={() => review(l.id, "rejected")}
                  >
                    Reject
                  </Button>
                </div>
              ) : (
                "-"
              )}
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
