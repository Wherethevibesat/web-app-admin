"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useConfirmDelete } from "@/components/ui/confirm-dialog";
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
import type { EventRow } from "@/lib/types/database";
import { EventReviewActions } from "@/components/admin/event-review-actions";

function statusBadgeVariant(status: string): "success" | "warning" | "danger" | "default" {
  if (status === "published") return "success";
  if (status === "cancelled") return "danger";
  if (status === "pending_review") return "warning";
  return "default";
}

type EventStatusFilter = "all" | "published" | "pending_review" | "draft" | "cancelled";
type EventTimeFilter = "all" | "upcoming" | "past";
type EventFeatureFilter = "all" | "featured" | "homepage_featured";
type EventSortField = "starts_at" | "title" | "status" | "venue";
type SortDirection = "asc" | "desc";

function eventMatchesSearch(event: EventRow, term: string): boolean {
  if (!term) return true;
  const haystack = [
    event.title,
    event.event_type,
    event.neighborhood,
    event.venue?.name,
    event.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(term);
}

function eventMatchesTime(event: EventRow, timeFilter: EventTimeFilter): boolean {
  if (timeFilter === "all") return true;
  const now = Date.now();
  const end = event.ends_at ? new Date(event.ends_at).getTime() : new Date(event.starts_at).getTime();
  const start = new Date(event.starts_at).getTime();
  if (timeFilter === "upcoming") return end >= now;
  return start < now;
}

export function EventsTable({ events }: { events: EventRow[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const confirmDelete = useConfirmDelete();
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EventStatusFilter>("all");
  const [timeFilter, setTimeFilter] = useState<EventTimeFilter>("all");
  const [featureFilter, setFeatureFilter] = useState<EventFeatureFilter>("all");
  const [sortField, setSortField] = useState<EventSortField>("starts_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const visibleEvents = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = events.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (!eventMatchesTime(e, timeFilter)) return false;
      if (featureFilter === "featured" && !e.featured) return false;
      if (featureFilter === "homepage_featured" && !e.homepage_featured) return false;
      return eventMatchesSearch(e, term);
    });

    return [...filtered].sort((a, b) => {
      let comp = 0;
      switch (sortField) {
        case "title":
          comp = a.title.localeCompare(b.title);
          break;
        case "status":
          comp = a.status.localeCompare(b.status);
          break;
        case "venue":
          comp = (a.venue?.name ?? "").localeCompare(b.venue?.name ?? "");
          break;
        case "starts_at":
        default:
          comp = new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
          break;
      }
      return sortDirection === "asc" ? comp : -comp;
    });
  }, [events, search, statusFilter, timeFilter, featureFilter, sortField, sortDirection]);

  const ids = visibleEvents.map((e) => e.id);
  const selection = useTableSelection(ids);
  const bulk = useBulkRequest(selection.clearSelection);

  async function remove(id: string, title: string) {
    if (!(await confirmDelete(title))) return;
    setBusy(id);
    await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
    setBusy(null);
    router.refresh();
  }

  async function activatePaidFeature(id: string, title: string) {
    const ok = await confirm({
      title: "Activate paid homepage feature?",
      description:
        `Charge and activate homepage featured slot for "${title}" using current settings.`,
      confirmLabel: "Activate",
    });
    if (!ok) return;
    setBusy(id);
    const res = await fetch(`/api/admin/events/${id}/feature`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "activate_paid" }),
    });
    setBusy(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Activation failed");
      return;
    }
    router.refresh();
  }

  async function deactivateFeature(id: string) {
    setBusy(id);
    const res = await fetch(`/api/admin/events/${id}/feature`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deactivate" }),
    });
    setBusy(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Update failed");
      return;
    }
    router.refresh();
  }

  if (events.length === 0) {
    return <p className="text-wtva-muted">No events yet. Create one to get started.</p>;
  }

  const rowBusy = (id: string) => busy === id || bulk.busy;
  const hasActiveFilters =
    search.trim() !== "" ||
    statusFilter !== "all" ||
    timeFilter !== "all" ||
    featureFilter !== "all";

  return (
    <>
      <div className="mb-4 grid gap-3 rounded-lg border border-wtva-dark-300 bg-wtva-dark-400/50 p-4 md:grid-cols-6">
        <Input
          placeholder="Search title, venue, neighborhood, type"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="md:col-span-2"
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as EventStatusFilter)}
        >
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="pending_review">Pending review</option>
          <option value="draft">Draft</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        <Select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value as EventTimeFilter)}
        >
          <option value="all">All dates</option>
          <option value="upcoming">Upcoming</option>
          <option value="past">Past</option>
        </Select>
        <Select
          value={featureFilter}
          onChange={(e) => setFeatureFilter(e.target.value as EventFeatureFilter)}
        >
          <option value="all">All events</option>
          <option value="featured">Featured</option>
          <option value="homepage_featured">Homepage featured</option>
        </Select>
        <div className="flex gap-2">
          <Select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as EventSortField)}
          >
            <option value="starts_at">Sort by date</option>
            <option value="title">Sort by title</option>
            <option value="venue">Sort by venue</option>
            <option value="status">Sort by status</option>
          </Select>
          <Select
            value={sortDirection}
            onChange={(e) => setSortDirection(e.target.value as SortDirection)}
            className="max-w-[110px]"
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </Select>
        </div>
      </div>

      {visibleEvents.length === 0 ? (
        <p className="rounded-xl border border-dashed border-wtva-dark-300 p-8 text-center text-wtva-muted">
          No events match current filters.
          {hasActiveFilters ? (
            <>
              {" "}
              <button
                type="button"
                className="text-foreground underline"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setTimeFilter("all");
                  setFeatureFilter("all");
                }}
              >
                Clear filters
              </button>
            </>
          ) : null}
        </p>
      ) : (
        <>
      <BulkActionBar
        itemLabel="events"
        totalCount={visibleEvents.length}
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
            bulk.post(
              "/api/admin/events/bulk-status",
              { ids: selection.selectedIds, status: "published" },
              {
                confirm: {
                  title: `Publish ${selection.selectedCount} event(s)?`,
                  confirmLabel: "Publish",
                },
              },
            )
          }
        >
          Publish
        </Button>
        <Button
          variant="secondary"
          className="px-3 py-1 text-xs"
          disabled={bulk.busy}
          onClick={() =>
            bulk.post(
              "/api/admin/events/bulk-status",
              { ids: selection.selectedIds, status: "cancelled" },
              {
                confirm: {
                  title: `Cancel ${selection.selectedCount} event(s)?`,
                  variant: "danger",
                  confirmLabel: "Cancel events",
                },
              },
            )
          }
        >
          Cancel
        </Button>
        <Button
          variant="danger"
          className="px-3 py-1 text-xs"
          disabled={bulk.busy}
          onClick={() =>
            bulk.post(
              "/api/admin/events/bulk-delete",
              { ids: selection.selectedIds },
              { useDeleteConfirm: true, itemName: `${selection.selectedCount} events` },
            )
          }
        >
          Delete
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
            <DataTableHeaderCell>Title</DataTableHeaderCell>
            <DataTableHeaderCell>Venue</DataTableHeaderCell>
            <DataTableHeaderCell>Starts</DataTableHeaderCell>
            <DataTableHeaderCell>Status</DataTableHeaderCell>
            <DataTableHeaderCell className="text-right">Actions</DataTableHeaderCell>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {visibleEvents.map((e) => {
            const pending = e.status === "pending_review";
            return (
              <DataTableRow key={e.id}>
                <SelectRowCell
                  id={e.id}
                  label={e.title}
                  checked={selection.selected.has(e.id)}
                  disabled={rowBusy(e.id)}
                  onChange={selection.toggleOne}
                />
                <DataTableCell>
                  <Link href={`/events/${e.id}/edit`} className="font-medium hover:underline">
                    {e.title}
                  </Link>
                  {e.featured && <Badge className="ml-2" variant="warning">Featured</Badge>}
                  {e.homepage_featured && (
                    <Badge className="ml-2" variant="success">
                      Homepage Featured
                    </Badge>
                  )}
                </DataTableCell>
                <DataTableCell>{e.venue?.name ?? "—"}</DataTableCell>
                <DataTableCell>{new Date(e.starts_at).toLocaleString()}</DataTableCell>
                <DataTableCell>
                  <Badge variant={statusBadgeVariant(e.status)}>{e.status}</Badge>
                </DataTableCell>
                <DataTableCell className="text-right">
                  {pending && (
                    <div className="mb-2">
                      <EventReviewActions eventId={e.id} disabled={rowBusy(e.id)} compact />
                    </div>
                  )}
                  <Link href={`/events/${e.id}/edit`}>
                    <Button variant="ghost" className="px-2 py-1 text-xs">Edit</Button>
                  </Link>
                  {e.homepage_featured ? (
                    <Button
                      variant="secondary"
                      className="ml-2 px-2 py-1 text-xs"
                      disabled={rowBusy(e.id)}
                      onClick={() => deactivateFeature(e.id)}
                    >
                      Remove homepage feature
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      className="ml-2 px-2 py-1 text-xs"
                      disabled={rowBusy(e.id)}
                      onClick={() => activatePaidFeature(e.id, e.title)}
                    >
                      Activate paid homepage feature
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    className="ml-2 px-2 py-1 text-xs"
                    disabled={rowBusy(e.id)}
                    onClick={() => remove(e.id, e.title)}
                  >
                    Delete
                  </Button>
                </DataTableCell>
              </DataTableRow>
            );
          })}
        </DataTableBody>
      </DataTable>
        </>
      )}
    </>
  );
}
