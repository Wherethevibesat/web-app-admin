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
import type { AdminMessageCampaign } from "@/lib/admin/messages";

function statusVariant(status: string): "success" | "warning" | "danger" | "default" {
  if (status === "sent") return "success";
  if (status === "sending") return "warning";
  if (status === "failed") return "danger";
  return "default";
}

export function MessageCampaignsTable({ campaigns }: { campaigns: AdminMessageCampaign[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function sendDraft(id: string) {
    setBusyId(id);
    const res = await fetch(`/api/admin/messages/campaigns/${id}/send`, { method: "POST" });
    setBusyId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Send failed");
      return;
    }
    router.refresh();
  }

  if (campaigns.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-wtva-dark-300 p-8 text-center text-wtva-muted">
        No campaigns yet.
      </p>
    );
  }

  return (
    <DataTable>
      <DataTableHead>
        <tr>
          <DataTableHeaderCell>Subject</DataTableHeaderCell>
          <DataTableHeaderCell>Audience</DataTableHeaderCell>
          <DataTableHeaderCell>Status</DataTableHeaderCell>
          <DataTableHeaderCell>Recipients</DataTableHeaderCell>
          <DataTableHeaderCell>Sent / Failed</DataTableHeaderCell>
          <DataTableHeaderCell>Date</DataTableHeaderCell>
          <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell>
        </tr>
      </DataTableHead>
      <DataTableBody>
        {campaigns.map((c) => (
          <DataTableRow key={c.id}>
            <DataTableCell className="font-medium">{c.subject}</DataTableCell>
            <DataTableCell className="capitalize">{c.audience}</DataTableCell>
            <DataTableCell>
              <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
            </DataTableCell>
            <DataTableCell>{c.recipient_count}</DataTableCell>
            <DataTableCell>
              {c.sent_count} / {c.failed_count}
            </DataTableCell>
            <DataTableCell className="text-wtva-muted">
              {new Date(c.created_at).toLocaleString()}
            </DataTableCell>
            <DataTableCell className="text-right">
              {c.status === "draft" && (
                <Button
                  className="px-2 py-1 text-xs"
                  disabled={busyId === c.id}
                  onClick={() => sendDraft(c.id)}
                >
                  {busyId === c.id ? "Sending..." : "Send"}
                </Button>
              )}
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
