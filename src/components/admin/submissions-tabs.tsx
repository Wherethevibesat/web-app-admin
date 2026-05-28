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
import { ImpersonateButton } from "@/components/admin/impersonate-button";
import type { VenueRow } from "@/lib/types/venue";
import type { EventRow } from "@/lib/types/database";
import type { DriverCompanySubmission } from "@/lib/admin/drivers";
import type { PromoterLinkSubmission } from "@/lib/admin/promoters";
import { EventReviewActions } from "@/components/admin/event-review-actions";
import {
  BulkActionBar,
  SelectAllHeaderCell,
  SelectRowCell,
  useTableSelection,
} from "@/components/admin/table-selection";
import { useBulkRequest } from "@/components/admin/use-bulk-request";

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
  const venueIds = venues.map((v) => v.id);
  const eventIds = events.map((e) => e.id);
  const driverIds = drivers.map((d) => d.id);
  const linkIds = promoterLinks.map((l) => l.id);
  const promoterEventIds = promoterEvents.map((e) => (e as { id: string }).id);
  const venueSelection = useTableSelection(venueIds);
  const eventSelection = useTableSelection(eventIds);
  const driverSelection = useTableSelection(driverIds);
  const linkSelection = useTableSelection(linkIds);
  const promoterEventSelection = useTableSelection(promoterEventIds);
  const venueBulk = useBulkRequest(venueSelection.clearSelection);
  const eventBulk = useBulkRequest(eventSelection.clearSelection);
  const driverBulk = useBulkRequest(driverSelection.clearSelection);
  const linkBulk = useBulkRequest(linkSelection.clearSelection);
  const promoterEventBulk = useBulkRequest(promoterEventSelection.clearSelection);

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
          <>
            <BulkActionBar
              itemLabel="venues"
              totalCount={venues.length}
              selectedCount={venueSelection.selectedCount}
              allSelected={venueSelection.allSelected}
              busy={venueBulk.busy}
              onSelectAll={venueSelection.toggleAll}
              onClear={venueSelection.clearSelection}
            >
              <Button
                className="px-3 py-1 text-xs"
                disabled={venueBulk.busy}
                onClick={() =>
                  venueBulk.post("/api/admin/venues/bulk", {
                    ids: venueSelection.selectedIds,
                    action: "publish",
                  })
                }
              >
                Approve & publish
              </Button>
            </BulkActionBar>
            <DataTable>
              <DataTableHead>
                <tr>
                  <SelectAllHeaderCell
                    checked={venueSelection.allSelected}
                    disabled={venueBulk.busy}
                    onChange={venueSelection.toggleAll}
                  />
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
                    <SelectRowCell
                      id={v.id}
                      label={v.name}
                      checked={venueSelection.selected.has(v.id)}
                      disabled={busy === v.id || venueBulk.busy}
                      onChange={venueSelection.toggleOne}
                    />
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
                      <div className="flex flex-wrap justify-end gap-2">
                        {v.owner_id ? (
                          <ImpersonateButton userId={v.owner_id} label="Login as owner" />
                        ) : null}
                        <Button
                          disabled={busy === v.id || venueBulk.busy}
                          className="px-3 py-1 text-xs"
                          onClick={() => publishVenue(v.id)}
                        >
                          Approve & publish
                        </Button>
                      </div>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          </>
        )
      ) : tab === "events" ? (
        events.length === 0 ? (
          <p className="text-wtva-muted">No pending events.</p>
        ) : (
          <>
            <BulkActionBar
              itemLabel="events"
              totalCount={events.length}
              selectedCount={eventSelection.selectedCount}
              allSelected={eventSelection.allSelected}
              busy={eventBulk.busy}
              onSelectAll={eventSelection.toggleAll}
              onClear={eventSelection.clearSelection}
            >
              <Button
                className="px-3 py-1 text-xs"
                disabled={eventBulk.busy}
                onClick={() =>
                  eventBulk.post("/api/admin/events/bulk-status", {
                    ids: eventSelection.selectedIds,
                    status: "published",
                  })
                }
              >
                Approve & publish
              </Button>
            </BulkActionBar>
            <DataTable>
              <DataTableHead>
                <tr>
                  <SelectAllHeaderCell
                    checked={eventSelection.allSelected}
                    disabled={eventBulk.busy}
                    onChange={eventSelection.toggleAll}
                  />
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
                    <SelectRowCell
                      id={e.id}
                      label={e.title}
                      checked={eventSelection.selected.has(e.id)}
                      disabled={busy === e.id || eventBulk.busy}
                      onChange={eventSelection.toggleOne}
                    />
                    <DataTableCell>{e.title}</DataTableCell>
                    <DataTableCell>{e.venue?.name ?? "-"}</DataTableCell>
                    <DataTableCell>{new Date(e.starts_at).toLocaleString()}</DataTableCell>
                    <DataTableCell>
                      <Badge variant="warning">{e.status}</Badge>
                    </DataTableCell>
                    <DataTableCell className="text-right">
                      <EventReviewActions
                        eventId={e.id}
                        disabled={busy === e.id || eventBulk.busy}
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
          <>
            <BulkActionBar
              itemLabel="drivers"
              totalCount={drivers.length}
              selectedCount={driverSelection.selectedCount}
              allSelected={driverSelection.allSelected}
              busy={driverBulk.busy}
              onSelectAll={driverSelection.toggleAll}
              onClear={driverSelection.clearSelection}
            >
              <Button
                className="px-3 py-1 text-xs"
                disabled={driverBulk.busy}
                onClick={() =>
                  driverBulk.post("/api/admin/drivers/bulk", {
                    ids: driverSelection.selectedIds,
                    action: "publish",
                  })
                }
              >
                Approve & publish
              </Button>
            </BulkActionBar>
            <DataTable>
              <DataTableHead>
                <tr>
                  <SelectAllHeaderCell
                    checked={driverSelection.allSelected}
                    disabled={driverBulk.busy}
                    onChange={driverSelection.toggleAll}
                  />
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
                    <SelectRowCell
                      id={d.id}
                      label={d.company_name}
                      checked={driverSelection.selected.has(d.id)}
                      disabled={busy === d.id || driverBulk.busy}
                      onChange={driverSelection.toggleOne}
                    />
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
                        disabled={busy === d.id || driverBulk.busy}
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
          </>
        )
      ) : promoterLinks.length === 0 && promoterEvents.length === 0 ? (
        <p className="text-wtva-muted">No pending promoter submissions.</p>
      ) : (
        <div className="space-y-10">
          {promoterLinks.length > 0 && (
            <section>
              <h2 className="mb-3 font-semibold">Venue access requests</h2>
              <BulkActionBar
                itemLabel="requests"
                totalCount={promoterLinks.length}
                selectedCount={linkSelection.selectedCount}
                allSelected={linkSelection.allSelected}
                busy={linkBulk.busy}
                onSelectAll={linkSelection.toggleAll}
                onClear={linkSelection.clearSelection}
              >
                <Button
                  className="px-3 py-1 text-xs"
                  disabled={linkBulk.busy}
                  onClick={() =>
                    linkBulk.post("/api/admin/promoter-links/bulk", {
                      ids: linkSelection.selectedIds,
                      action: "approve",
                    })
                  }
                >
                  Approve
                </Button>
                <Button
                  variant="secondary"
                  className="px-3 py-1 text-xs"
                  disabled={linkBulk.busy}
                  onClick={() =>
                    linkBulk.post("/api/admin/promoter-links/bulk", {
                      ids: linkSelection.selectedIds,
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
                      checked={linkSelection.allSelected}
                      disabled={linkBulk.busy}
                      onChange={linkSelection.toggleAll}
                    />
                    <DataTableHeaderCell>Promoter</DataTableHeaderCell>
                    <DataTableHeaderCell>Venue</DataTableHeaderCell>
                    <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell>
                  </tr>
                </DataTableHead>
                <DataTableBody>
                  {promoterLinks.map((l) => (
                    <DataTableRow key={l.id}>
                      <SelectRowCell
                        id={l.id}
                        label={l.promoter?.name ?? l.id}
                        checked={linkSelection.selected.has(l.id)}
                        disabled={busy === l.id || linkBulk.busy}
                        onChange={linkSelection.toggleOne}
                      />
                      <DataTableCell>
                        {l.promoter?.name ?? "-"}
                        <br />
                        <span className="text-xs text-wtva-muted">{l.promoter?.email}</span>
                      </DataTableCell>
                      <DataTableCell>{l.venue?.name ?? l.venue_id}</DataTableCell>
                      <DataTableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            disabled={busy === l.id || linkBulk.busy}
                            className="px-3 py-1 text-xs"
                            onClick={() => reviewPromoterLink(l.id, "approved")}
                          >
                            Approve
                          </Button>
                          <Button
                            disabled={busy === l.id || linkBulk.busy}
                            variant="ghost"
                            className="px-3 py-1 text-xs"
                            onClick={() => reviewPromoterLink(l.id, "rejected")}
                          >
                            Reject
                          </Button>
                        </div>
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
              <BulkActionBar
                itemLabel="events"
                totalCount={promoterEvents.length}
                selectedCount={promoterEventSelection.selectedCount}
                allSelected={promoterEventSelection.allSelected}
                busy={promoterEventBulk.busy}
                onSelectAll={promoterEventSelection.toggleAll}
                onClear={promoterEventSelection.clearSelection}
              >
                <Button
                  className="px-3 py-1 text-xs"
                  disabled={promoterEventBulk.busy}
                  onClick={() =>
                    promoterEventBulk.post("/api/admin/promoter-events/bulk", {
                      ids: promoterEventSelection.selectedIds,
                      action: "approve",
                    })
                  }
                >
                  Approve & publish
                </Button>
                <Button
                  variant="secondary"
                  className="px-3 py-1 text-xs"
                  disabled={promoterEventBulk.busy}
                  onClick={() =>
                    promoterEventBulk.post("/api/admin/promoter-events/bulk", {
                      ids: promoterEventSelection.selectedIds,
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
                      checked={promoterEventSelection.allSelected}
                      disabled={promoterEventBulk.busy}
                      onChange={promoterEventSelection.toggleAll}
                    />
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
                        <SelectRowCell
                          id={ev.id}
                          label={ev.title}
                          checked={promoterEventSelection.selected.has(ev.id)}
                          disabled={busy === ev.id || promoterEventBulk.busy}
                          onChange={promoterEventSelection.toggleOne}
                        />
                        <DataTableCell>{ev.title}</DataTableCell>
                        <DataTableCell>{venueName ?? "-"}</DataTableCell>
                        <DataTableCell>
                          {new Date(ev.starts_at).toLocaleString()}
                        </DataTableCell>
                        <DataTableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              disabled={busy === ev.id || promoterEventBulk.busy}
                              className="px-3 py-1 text-xs"
                              onClick={() => reviewPromoterEvent(ev.id, "approved")}
                            >
                              Approve & publish
                            </Button>
                            <Button
                              disabled={busy === ev.id || promoterEventBulk.busy}
                              variant="ghost"
                              className="px-3 py-1 text-xs"
                              onClick={() => reviewPromoterEvent(ev.id, "rejected")}
                            >
                              Reject
                            </Button>
                          </div>
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
