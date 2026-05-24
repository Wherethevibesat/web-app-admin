"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/admin/data-table";
import type { VenueRow } from "@/lib/types/venue";
import type { EventRow } from "@/lib/types/database";
import { EventReviewActions } from "@/components/admin/event-review-actions";
import { TableCheckbox } from "@/components/ui/table-checkbox";
import {
  EventBulkApproveBar,
  useBulkApproveEvents,
  usePendingEventSelection,
} from "@/components/admin/event-bulk-approve";

export function SubmissionsTabs({
  venues,
  events,
  tab,
}: {
  venues: VenueRow[];
  events: EventRow[];
  tab: "venues" | "events";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const selection = usePendingEventSelection(events);
  const bulk = useBulkApproveEvents(selection.clearSelection);

  async function publishVenue(id: string) {
    setBusy(id);
    await fetch(`/api/admin/venues/${id}/patch`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: true }),
    });
    setBusy(null);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-6 flex gap-2 border-b border-wtva-dark-300">
        <Link
          href="/submissions?tab=venues"
          className={`px-4 py-2 text-sm font-medium ${
            tab === "venues"
              ? "border-b-2 border-foreground text-foreground"
              : "text-wtva-muted"
          }`}
        >
          Venues ({venues.length})
        </Link>
        <Link
          href="/submissions?tab=events"
          className={`px-4 py-2 text-sm font-medium ${
            tab === "events"
              ? "border-b-2 border-foreground text-foreground"
              : "text-wtva-muted"
          }`}
        >
          Events ({events.length})
        </Link>
      </div>

      {tab === "venues" ? (
        venues.length === 0 ? (
          <p className="text-wtva-muted">No unpublished venue submissions.</p>
        ) : (
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeaderCell>Name</DataTableHeaderCell>
                <DataTableHeaderCell>Type</DataTableHeaderCell>
                <DataTableHeaderCell>Area</DataTableHeaderCell>
                <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {venues.map((v) => (
                <DataTableRow key={v.id}>
                  <DataTableCell>{v.name}</DataTableCell>
                  <DataTableCell>{v.venue_type}</DataTableCell>
                  <DataTableCell>{v.neighborhood ?? "—"}</DataTableCell>
                  <DataTableCell className="text-right">
                    <Button
                      disabled={busy === v.id}
                      className="px-3 py-1 text-xs"
                      onClick={() => publishVenue(v.id)}
                    >
                      Approve & publish
                    </Button>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )
      ) : events.length === 0 ? (
        <p className="text-wtva-muted">
          No pending events. Run migration 004 if the events table is missing.
        </p>
      ) : (
        <>
          <EventBulkApproveBar
            pendingCount={selection.pendingIds.length}
            selectedCount={selection.selectedCount}
            allPendingSelected={selection.allPendingSelected}
            busy={bulk.busy}
            onSelectAll={selection.toggleAll}
            onApprove={() => bulk.approveSelected([...selection.selected])}
            onClear={selection.clearSelection}
          />
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeaderCell className="w-12">
                  <TableCheckbox
                    checked={selection.allPendingSelected}
                    onChange={(e) => selection.toggleAll(e.target.checked)}
                    aria-label="Select all pending events"
                  />
                </DataTableHeaderCell>
                <DataTableHeaderCell>Title</DataTableHeaderCell>
                <DataTableHeaderCell>Venue</DataTableHeaderCell>
                <DataTableHeaderCell>Starts</DataTableHeaderCell>
                <DataTableHeaderCell>Status</DataTableHeaderCell>
                <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {events.map((e) => (
                <DataTableRow key={e.id}>
                  <DataTableCell>
                    <TableCheckbox
                      checked={selection.selected.has(e.id)}
                      disabled={busy === e.id || bulk.busy}
                      onChange={(ev) => selection.toggleOne(e.id, ev.target.checked)}
                      aria-label={`Select ${e.title}`}
                    />
                  </DataTableCell>
                  <DataTableCell>{e.title}</DataTableCell>
                  <DataTableCell>{e.venue?.name ?? "—"}</DataTableCell>
                  <DataTableCell>
                    {new Date(e.starts_at).toLocaleString()}
                  </DataTableCell>
                  <DataTableCell>
                    <Badge variant="warning">{e.status}</Badge>
                  </DataTableCell>
                  <DataTableCell className="text-right">
                    <EventReviewActions
                      eventId={e.id}
                      disabled={busy === e.id || bulk.busy}
                    />
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </>
      )}
    </div>
  );
}
