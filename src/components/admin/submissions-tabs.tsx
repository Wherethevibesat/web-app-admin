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
import type { DriverCompanySubmission } from "@/lib/admin/drivers";
import type { PromoterLinkSubmission } from "@/lib/admin/promoters";
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
  drivers,
  promoterLinks,
  promoterEvents,
  tab,
}: {
  venues: VenueRow[];
  events: EventRow[];
  drivers: DriverCompanySubmission[];
  promoterLinks: PromoterLinkSubmission[];
  promoterEvents: Record<string, unknown>[];
  tab: "venues" | "events" | "drivers" | "promoters";
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

  async function publishDriver(id: string) {
    setBusy(id);
    await fetch(`/api/admin/drivers/${id}/patch`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published", published: true }),
    });
    setBusy(null);
    router.refresh();
  }

  async function reviewPromoterLink(id: string, status: "approved" | "rejected") {
    setBusy(id);
    await fetch(`/api/admin/promoter-links/${id}/patch`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(null);
    router.refresh();
  }

  async function reviewPromoterEvent(id: string, approval: "approved" | "rejected") {
    setBusy(id);
    await fetch(`/api/admin/promoter-events/${id}/patch`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approval, publish: approval === "approved" }),
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
        <Link
          href="/submissions?tab=drivers"
          className={`px-4 py-2 text-sm font-medium ${
            tab === "drivers"
              ? "border-b-2 border-foreground text-foreground"
              : "text-wtva-muted"
          }`}
        >
          Drivers ({drivers.length})
        </Link>
        <Link
          href="/submissions?tab=promoters"
          className={`px-4 py-2 text-sm font-medium ${
            tab === "promoters"
              ? "border-b-2 border-foreground text-foreground"
              : "text-wtva-muted"
          }`}
        >
          Promoters ({promoterLinks.length + promoterEvents.length})
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
                <DataTableHeaderCell>Listing expires</DataTableHeaderCell>
                <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {venues.map((v) => (
                <DataTableRow key={v.id}>
                  <DataTableCell>{v.name}</DataTableCell>
                  <DataTableCell>{v.venue_type}</DataTableCell>
                  <DataTableCell>{v.neighborhood ?? "-"}</DataTableCell>
                  <DataTableCell>
                    {v.listing_expires_at
                      ? new Date(v.listing_expires_at).toLocaleDateString()
                      : v.listing_paid_at
                        ? "-"
                        : "Not paid"}
                  </DataTableCell>
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
      ) : tab === "events" ? (
        events.length === 0 ? (
          <p className="text-wtva-muted">No pending events.</p>
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
                    <DataTableCell>{e.venue?.name ?? "-"}</DataTableCell>
                    <DataTableCell>{new Date(e.starts_at).toLocaleString()}</DataTableCell>
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
        )
      ) : tab === "drivers" ? (
        drivers.length === 0 ? (
          <p className="text-wtva-muted">No pending driver listings.</p>
        ) : (
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableHeaderCell>Company</DataTableHeaderCell>
                <DataTableHeaderCell>City</DataTableHeaderCell>
                <DataTableHeaderCell>Email</DataTableHeaderCell>
                <DataTableHeaderCell>Listing expires</DataTableHeaderCell>
                <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {drivers.map((d) => (
                <DataTableRow key={d.id}>
                  <DataTableCell>{d.company_name}</DataTableCell>
                  <DataTableCell>{d.city ?? "-"}</DataTableCell>
                  <DataTableCell>{d.contact_email ?? "-"}</DataTableCell>
                  <DataTableCell>
                    {d.listing_expires_at
                      ? new Date(d.listing_expires_at).toLocaleDateString()
                      : "-"}
                  </DataTableCell>
                  <DataTableCell className="text-right">
                    <Button
                      disabled={busy === d.id}
                      className="px-3 py-1 text-xs"
                      onClick={() => publishDriver(d.id)}
                    >
                      Approve & publish
                    </Button>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )
      ) : promoterLinks.length === 0 && promoterEvents.length === 0 ? (
        <p className="text-wtva-muted">No pending promoter submissions.</p>
      ) : (
        <div className="space-y-10">
          {promoterLinks.length > 0 && (
            <section>
              <h2 className="mb-3 font-semibold">Venue access requests</h2>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell>Promoter</DataTableHeaderCell>
                    <DataTableHeaderCell>Venue</DataTableHeaderCell>
                    <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <DataTableBody>
                  {promoterLinks.map((l) => (
                    <DataTableRow key={l.id}>
                      <DataTableCell>
                        {l.promoter?.name ?? "-"}
                        <br />
                        <span className="text-xs text-wtva-muted">{l.promoter?.email}</span>
                      </DataTableCell>
                      <DataTableCell>{l.venue?.name ?? l.venue_id}</DataTableCell>
                      <DataTableCell className="text-right space-x-2">
                        <Button
                          disabled={busy === l.id}
                          className="px-3 py-1 text-xs"
                          onClick={() => reviewPromoterLink(l.id, "approved")}
                        >
                          Approve
                        </Button>
                        <Button
                          disabled={busy === l.id}
                          variant="ghost"
                          className="px-3 py-1 text-xs"
                          onClick={() => reviewPromoterLink(l.id, "rejected")}
                        >
                          Reject
                        </Button>
                      </DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            </section>
          )}
          {promoterEvents.length > 0 && (
            <section>
              <h2 className="mb-3 font-semibold">Promoter-created events</h2>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableHeaderCell>Event</DataTableHeaderCell>
                    <DataTableHeaderCell>Venue</DataTableHeaderCell>
                    <DataTableHeaderCell>Date</DataTableHeaderCell>
                    <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <DataTableBody>
                  {promoterEvents.map((e) => {
                    const ev = e as {
                      id: string;
                      title: string;
                      starts_at: string;
                      venue?: { name: string } | { name: string }[];
                    };
                    const venueName = Array.isArray(ev.venue)
                      ? ev.venue[0]?.name
                      : ev.venue?.name;
                    return (
                      <DataTableRow key={ev.id}>
                        <DataTableCell>{ev.title}</DataTableCell>
                        <DataTableCell>{venueName ?? "-"}</DataTableCell>
                        <DataTableCell>
                          {new Date(ev.starts_at).toLocaleString()}
                        </DataTableCell>
                        <DataTableCell className="text-right space-x-2">
                          <Button
                            disabled={busy === ev.id}
                            className="px-3 py-1 text-xs"
                            onClick={() => reviewPromoterEvent(ev.id, "approved")}
                          >
                            Approve & publish
                          </Button>
                          <Button
                            disabled={busy === ev.id}
                            variant="ghost"
                            className="px-3 py-1 text-xs"
                            onClick={() => reviewPromoterEvent(ev.id, "rejected")}
                          >
                            Reject
                          </Button>
                        </DataTableCell>
                      </DataTableRow>
                    );
                  })}
                </DataTableBody>
              </DataTable>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
