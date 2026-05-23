"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { NeighborhoodSelect } from "@/components/admin/neighborhood-select";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import type { EventRow } from "@/lib/types/database";
import type { NeighborhoodRow } from "@/lib/types/neighborhood";
import {
  EVENT_STATUSES,
  DEFAULT_EVENT_TYPE,
  EVENT_TYPES,
  type EventFormData,
} from "@/lib/types/event";
import type { VenueRow } from "@/lib/types/venue";

function toLocalDatetime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toForm(event?: EventRow | null): EventFormData {
  return {
    id: event?.id,
    venue_id: event?.venue_id ?? "",
    title: event?.title ?? "",
    description: event?.description ?? "",
    event_type: event?.event_type ?? DEFAULT_EVENT_TYPE,
    neighborhood: event?.neighborhood ?? "",
    starts_at: toLocalDatetime(event?.starts_at) || toLocalDatetime(new Date().toISOString()),
    ends_at: toLocalDatetime(event?.ends_at),
    image_url: event?.image_url ?? "",
    status: (event?.status as EventFormData["status"]) ?? "pending_review",
    featured: event?.featured ?? false,
  };
}

export function EventForm({
  event,
  venues,
  neighborhoods,
}: {
  event?: EventRow | null;
  venues: VenueRow[];
  neighborhoods: NeighborhoodRow[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(() => toForm(event));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof EventFormData>(key: K, value: EventFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
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
          <Label htmlFor="starts_at">Starts *</Label>
          <Input id="starts_at" type="datetime-local" required value={form.starts_at} onChange={(e) => update("starts_at", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="ends_at">Ends</Label>
          <Input id="ends_at" type="datetime-local" value={form.ends_at} onChange={(e) => update("ends_at", e.target.value)} />
        </div>
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" rows={4} value={form.description} onChange={(e) => update("description", e.target.value)} />
      </div>
      <div>
        <Label htmlFor="image_url">Image URL</Label>
        <Input id="image_url" value={form.image_url} onChange={(e) => update("image_url", e.target.value)} />
      </div>
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
