"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import type { EventRow } from "@/lib/types/database";
import type { EventGuideFormData, EventGuideRow } from "@/lib/types/event-guide";

function toForm(
  guide?: EventGuideRow | null,
  eventIds: string[] = [],
): EventGuideFormData {
  return {
    id: guide?.id,
    slug: guide?.slug ?? "labor-day-weekend-2026",
    title: guide?.title ?? "Labor Day Weekend in Houston",
    subtitle: guide?.subtitle ?? "",
    city: guide?.city ?? "houston",
    starts_on: guide?.starts_on ?? "2026-09-04",
    ends_on: guide?.ends_on ?? "2026-09-07",
    cover_image_url: guide?.cover_image_url ?? "",
    posted_by_name: guide?.posted_by_name ?? "WTVA Events",
    published: guide?.published ?? true,
    featured_on_homepage: guide?.featured_on_homepage ?? true,
    event_ids: eventIds,
  };
}

export function EventGuideForm({
  guide,
  initialEventIds,
  events,
}: {
  guide?: EventGuideRow | null;
  initialEventIds: string[];
  events: EventRow[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(() => toForm(guide, initialEventIds));
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof EventGuideFormData>(key: K, value: EventGuideFormData[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const selected = useMemo(() => {
    const byId = new Map(events.map((event) => [event.id, event]));
    return form.event_ids.map((id) => byId.get(id)).filter(Boolean) as EventRow[];
  }, [events, form.event_ids]);

  const available = useMemo(() => {
    const selectedIds = new Set(form.event_ids);
    const term = query.trim().toLowerCase();
    return events.filter((event) => {
      if (selectedIds.has(event.id)) return false;
      if (!term) return true;
      return [event.title, event.venue?.name, event.neighborhood]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [events, form.event_ids, query]);

  function addEvent(id: string) {
    update("event_ids", [...form.event_ids, id]);
  }

  function removeEvent(id: string) {
    update(
      "event_ids",
      form.event_ids.filter((eventId) => eventId !== id),
    );
  }

  function moveEvent(id: string, direction: -1 | 1) {
    const index = form.event_ids.indexOf(id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= form.event_ids.length) return;
    const next = [...form.event_ids];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    update("event_ids", next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/guides", {
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
    const body = (await res.json()) as { id: string };
    router.push(`/guides/${body.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-5">
      <div>
        <Label htmlFor="title">Title *</Label>
        <Input id="title" required value={form.title} onChange={(e) => update("title", e.target.value)} />
      </div>
      <div>
        <Label htmlFor="subtitle">Subtitle</Label>
        <Textarea
          id="subtitle"
          rows={3}
          value={form.subtitle}
          onChange={(e) => update("subtitle", e.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" value={form.slug} onChange={(e) => update("slug", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="posted_by_name">Posted by</Label>
          <Input
            id="posted_by_name"
            value={form.posted_by_name}
            onChange={(e) => update("posted_by_name", e.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="starts_on">Starts</Label>
          <Input
            id="starts_on"
            type="date"
            required
            value={form.starts_on}
            onChange={(e) => update("starts_on", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="ends_on">Ends</Label>
          <Input
            id="ends_on"
            type="date"
            required
            value={form.ends_on}
            onChange={(e) => update("ends_on", e.target.value)}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.published}
          onChange={(e) => update("published", e.target.checked)}
        />
        Published
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.featured_on_homepage}
          onChange={(e) => update("featured_on_homepage", e.target.checked)}
        />
        Show on homepage
      </label>

      <div>
        <Label>Events in this guide</Label>
        <p className="mb-3 text-xs text-wtva-muted">
          Add existing events, then edit flyers, times, and RSVP links on each event page.
        </p>
        {selected.length === 0 && (
          <p className="mb-3 rounded-lg border border-dashed border-wtva-dark-300 px-3 py-4 text-sm text-wtva-muted">
            No events attached yet.
          </p>
        )}
        <ul className="space-y-2">
          {selected.map((event) => (
            <li
              key={event.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-wtva-dark-300 bg-wtva-card px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{event.title}</p>
                <p className="text-xs text-wtva-muted">
                  {event.venue?.name ?? "Venue TBA"} · {event.starts_at.slice(0, 16).replace("T", " ")}
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => moveEvent(event.id, -1)}>
                  Up
                </Button>
                <Button type="button" variant="secondary" onClick={() => moveEvent(event.id, 1)}>
                  Down
                </Button>
                <a href={`/events/${event.id}/edit`} className="text-xs font-semibold underline self-center">
                  Edit
                </a>
                <Button type="button" variant="ghost" onClick={() => removeEvent(event.id)}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <Label htmlFor="event-search">Add an event</Label>
        <Input
          id="event-search"
          placeholder="Search published events"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ul className="mt-2 max-h-56 overflow-auto rounded-lg border border-wtva-dark-300">
          {available.slice(0, 12).map((event) => (
            <li key={event.id} className="flex items-center justify-between gap-2 border-b border-wtva-dark-300 px-3 py-2 last:border-b-0">
              <div className="min-w-0">
                <p className="truncate text-sm">{event.title}</p>
                <p className="text-xs text-wtva-muted">{event.venue?.name ?? "Venue TBA"}</p>
              </div>
              <Button type="button" variant="secondary" onClick={() => addEvent(event.id)}>
                Add
              </Button>
            </li>
          ))}
        </ul>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Save guide"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/guides")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
