"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminTicketTiersEditor } from "@/components/admin/ticket-tiers-editor";
import { EventImageUpload } from "@/components/admin/event-image-upload";
import { NeighborhoodSelect } from "@/components/admin/neighborhood-select";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { WEEKDAY_LABELS } from "@/lib/event-occurrences";
import type { EventRow } from "@/lib/types/database";
import type { NeighborhoodRow } from "@/lib/types/neighborhood";
import {
  EVENT_STATUSES,
  DEFAULT_EVENT_TYPE,
  EVENT_TYPES,
  type EventFormData,
  type EventRecurrenceInput,
} from "@/lib/types/event";
import { FREE_RSVP_TIER_NAME, type TicketTierInput } from "@/lib/types/ticket";
import type { VenueRow } from "@/lib/types/venue";

function toLocalDatetime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const defaultRecurrence = (): EventRecurrenceInput => ({
  enabled: false,
  by_weekday: [],
  until_date: "",
  interval_weeks: 1,
});

function toForm(event?: EventRow | null, ticketTiers?: TicketTierInput[]): EventFormData {
  const starts = toLocalDatetime(event?.starts_at) || toLocalDatetime(new Date().toISOString());
  const startDate = new Date(starts);
  startDate.setHours(startDate.getHours() + 4);
  return {
    id: event?.id,
    venue_id: event?.venue_id ?? "",
    title: event?.title ?? "",
    description: event?.description ?? "",
    event_type: event?.event_type ?? DEFAULT_EVENT_TYPE,
    neighborhood: event?.neighborhood ?? "",
    starts_at: starts,
    ends_at: toLocalDatetime(event?.ends_at) || toLocalDatetime(startDate.toISOString()),
    image_url: event?.image_url ?? "",
    status: (event?.status as EventFormData["status"]) ?? "pending_review",
    featured: event?.featured ?? false,
    additional_dates: [],
    recurrence: defaultRecurrence(),
    ticket_tiers:
      ticketTiers && ticketTiers.length > 0
        ? ticketTiers
        : [{ name: FREE_RSVP_TIER_NAME, price_cents: 0, description: "" }],
  };
}

export function EventForm({
  event,
  venues,
  neighborhoods,
  ticketTiers,
}: {
  event?: EventRow | null;
  venues: VenueRow[];
  neighborhoods: NeighborhoodRow[];
  ticketTiers?: TicketTierInput[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(() => toForm(event, ticketTiers));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof EventFormData>(key: K, value: EventFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addAdditionalDate() {
    update("additional_dates", [...(form.additional_dates ?? []), ""]);
  }

  function setAdditionalDate(index: number, value: string) {
    const next = [...(form.additional_dates ?? [])];
    next[index] = value;
    update("additional_dates", next);
  }

  function toggleRecurrenceWeekday(day: number) {
    const current = form.recurrence ?? defaultRecurrence();
    const set = new Set(current.by_weekday);
    if (set.has(day)) set.delete(day);
    else set.add(day);
    update("recurrence", { ...current, by_weekday: [...set].sort() });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to save");
      return;
    }
    router.push("/events");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
      <div>
        <Label htmlFor="title">Title *</Label>
        <Input id="title" required value={form.title} onChange={(e) => update("title", e.target.value)} />
      </div>
      <div>
        <Label htmlFor="venue_id">Venue</Label>
        <Select id="venue_id" value={form.venue_id} onChange={(e) => update("venue_id", e.target.value)}>
          <option value="">— Select venue —</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </Select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="event_type">Event type</Label>
          <Select id="event_type" value={form.event_type} onChange={(e) => update("event_type", e.target.value)}>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select id="status" value={form.status} onChange={(e) => update("status", e.target.value as EventFormData["status"])}>
            {EVENT_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="neighborhood">Neighborhood</Label>
        <NeighborhoodSelect
          id="neighborhood"
          value={form.neighborhood}
          onChange={(value) => update("neighborhood", value)}
          neighborhoods={neighborhoods}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="starts_at">Start date & time *</Label>
          <Input id="starts_at" type="datetime-local" required value={form.starts_at} onChange={(e) => update("starts_at", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ends_at">End date & time</Label>
          <Input id="ends_at" type="datetime-local" value={form.ends_at} onChange={(e) => update("ends_at", e.target.value)} />
        </div>
      </div>

      {!form.id && (
        <>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Additional dates</Label>
              <Button type="button" variant="secondary" onClick={addAdditionalDate}>+ Date</Button>
            </div>
            {(form.additional_dates ?? []).map((value, index) => (
              <div key={index} className="mb-2 flex gap-2">
                <Input type="date" value={value} onChange={(e) => setAdditionalDate(index, e.target.value)} />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    update(
                      "additional_dates",
                      (form.additional_dates ?? []).filter((_, i) => i !== index),
                    )
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.recurrence?.enabled ?? false}
                onChange={(e) =>
                  update("recurrence", {
                    ...(form.recurrence ?? defaultRecurrence()),
                    enabled: e.target.checked,
                  })
                }
              />
              Repeat weekly
            </label>
            {(form.recurrence?.enabled ?? false) && (
              <div className="space-y-3 rounded-lg border border-border p-3">
                <div className="flex flex-wrap gap-2">
                  {WEEKDAY_LABELS.map((label, day) => {
                    const active = form.recurrence?.by_weekday.includes(day) ?? false;
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => toggleRecurrenceWeekday(day)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold border ${active ? "bg-foreground text-background" : ""}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <Label>
                  Repeat until
                  <Input
                    type="date"
                    value={form.recurrence?.until_date ?? ""}
                    onChange={(e) =>
                      update("recurrence", {
                        ...(form.recurrence ?? defaultRecurrence()),
                        until_date: e.target.value,
                      })
                    }
                  />
                </Label>
              </div>
            )}
          </div>
        </>
      )}

      <AdminTicketTiersEditor
        tiers={form.ticket_tiers ?? [{ name: FREE_RSVP_TIER_NAME, price_cents: 0, description: "" }]}
        onChange={(ticket_tiers) => update("ticket_tiers", ticket_tiers)}
      />

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" rows={4} value={form.description} onChange={(e) => update("description", e.target.value)} />
      </div>

      <EventImageUpload value={form.image_url} onChange={(image_url) => update("image_url", image_url)} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.featured} onChange={(e) => update("featured", e.target.checked)} />
        Featured event
      </label>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Save event"}</Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/events")}>Cancel</Button>
      </div>
    </form>
  );
}
