"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  PACKAGE_TEMPLATES,
  formatCents,
  slotTypeLabel,
  type NightPackageFormData,
  type NightPackageRow,
  type PackageStopOfferRow,
} from "@/lib/types/night-package";

export function NightPackageForm({
  initial,
  approvedStops,
}: {
  initial?: NightPackageRow | null;
  approvedStops: PackageStopOfferRow[];
}) {
  const router = useRouter();
  const orderedInitialIds =
    initial?.stops?.slice().sort((a, b) => a.sort_order - b.sort_order).map((s) => s.stop_offer_id) ??
    [];
  const orderedLabels =
    initial?.stops?.slice().sort((a, b) => a.sort_order - b.sort_order).map((s) => s.scheduled_label ?? "") ??
    [];

  const [form, setForm] = useState<NightPackageFormData>({
    id: initial?.id,
    title: initial?.title ?? "",
    subtitle: initial?.subtitle ?? "",
    description: initial?.description ?? "",
    tagline: initial?.tagline ?? "",
    why_this_works: initial?.why_this_works ?? "",
    perfect_for: (initial?.perfect_for ?? []).join("\n"),
    not_ideal_for: (initial?.not_ideal_for ?? []).join("\n"),
    diy_compare_dollars:
      initial?.diy_compare_cents != null
        ? String(initial.diy_compare_cents / 100)
        : "",
    rating: initial?.rating != null ? String(initial.rating) : "",
    groups_booked:
      initial?.groups_booked != null ? String(initial.groups_booked) : "",
    vibe_tags: (initial?.vibe_tags ?? []).join(", "),
    energy_score:
      initial?.energy_score != null ? String(initial.energy_score) : "",
    travel_minutes:
      initial?.travel_minutes != null ? String(initial.travel_minutes) : "",
    crowd_label: initial?.crowd_label ?? "",
    music_tags: (initial?.music_tags ?? []).join(", "),
    template_key: initial?.template_key ?? "out_of_town",
    city: initial?.city ?? "houston",
    image_url: initial?.image_url ?? "",
    status: initial?.status ?? "draft",
    starts_on: initial?.starts_on ?? "",
    party_size_min: initial?.party_size_min ?? 1,
    party_size_max: initial?.party_size_max ?? 8,
    sort_order: initial?.sort_order ?? 0,
    is_featured: initial?.is_featured ?? false,
    stop_offer_ids: orderedInitialIds,
    scheduled_labels: orderedLabels.length ? orderedLabels : [],
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = useMemo(() => {
    return form.stop_offer_ids.reduce((sum, id) => {
      const stop = approvedStops.find((s) => s.id === id);
      return sum + (stop?.price_cents ?? 0);
    }, 0);
  }, [form.stop_offer_ids, approvedStops]);

  function toggleStop(id: string) {
    setForm((prev) => {
      const exists = prev.stop_offer_ids.includes(id);
      if (exists) {
        const idx = prev.stop_offer_ids.indexOf(id);
        return {
          ...prev,
          stop_offer_ids: prev.stop_offer_ids.filter((x) => x !== id),
          scheduled_labels: prev.scheduled_labels.filter((_, i) => i !== idx),
        };
      }
      return {
        ...prev,
        stop_offer_ids: [...prev.stop_offer_ids, id],
        scheduled_labels: [...prev.scheduled_labels, ""],
      };
    });
  }

  function moveStop(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= form.stop_offer_ids.length) return;
    setForm((prev) => {
      const ids = [...prev.stop_offer_ids];
      const labels = [...prev.scheduled_labels];
      [ids[index], ids[next]] = [ids[next], ids[index]];
      [labels[index], labels[next]] = [labels[next] ?? "", labels[index] ?? ""];
      return { ...prev, stop_offer_ids: ids, scheduled_labels: labels };
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }
    if (form.stop_offer_ids.length < 2) {
      setError("Add at least 2 approved stops for a night flow");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/night-packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not save package");
      return;
    }
    router.push("/night-packages");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-6">
      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Out of Town Sunday"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="subtitle">Subtitle</Label>
          <Input
            id="subtitle"
            value={form.subtitle}
            onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
            placeholder="Brunch → day party → night → after hours"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            className="min-h-24 w-full rounded-lg border border-wtva-dark-300 bg-wtva-card px-3 py-2 text-sm"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="tagline">Tagline (Preview hero)</Label>
          <Input
            id="tagline"
            value={form.tagline}
            onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
            placeholder="The perfect Saturday if you want to experience Houston like a local."
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="why_this_works">Why this works</Label>
          <textarea
            id="why_this_works"
            className="min-h-20 w-full rounded-lg border border-wtva-dark-300 bg-wtva-card px-3 py-2 text-sm"
            value={form.why_this_works}
            onChange={(e) => setForm((f) => ({ ...f, why_this_works: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="perfect_for">Perfect if you… (one per line)</Label>
          <textarea
            id="perfect_for"
            className="min-h-24 w-full rounded-lg border border-wtva-dark-300 bg-wtva-card px-3 py-2 text-sm"
            value={form.perfect_for}
            onChange={(e) => setForm((f) => ({ ...f, perfect_for: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="not_ideal_for">Not ideal if… (one per line)</Label>
          <textarea
            id="not_ideal_for"
            className="min-h-24 w-full rounded-lg border border-wtva-dark-300 bg-wtva-card px-3 py-2 text-sm"
            value={form.not_ideal_for}
            onChange={(e) => setForm((f) => ({ ...f, not_ideal_for: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="vibe_tags">Vibe tags (comma-separated)</Label>
          <Input
            id="vibe_tags"
            value={form.vibe_tags}
            onChange={(e) => setForm((f) => ({ ...f, vibe_tags: e.target.value }))}
            placeholder="Luxury, Rooftops, VIP"
          />
        </div>
        <div>
          <Label htmlFor="music_tags">Music tags (comma-separated)</Label>
          <Input
            id="music_tags"
            value={form.music_tags}
            onChange={(e) => setForm((f) => ({ ...f, music_tags: e.target.value }))}
            placeholder="Hip-Hop, Afrobeats, R&B"
          />
        </div>
        <div>
          <Label htmlFor="diy">DIY compare price ($)</Label>
          <Input
            id="diy"
            type="number"
            min={0}
            step="1"
            value={form.diy_compare_dollars}
            onChange={(e) =>
              setForm((f) => ({ ...f, diy_compare_dollars: e.target.value }))
            }
          />
        </div>
        <div>
          <Label htmlFor="rating">Rating</Label>
          <Input
            id="rating"
            type="number"
            min={0}
            max={5}
            step="0.1"
            value={form.rating}
            onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="groups">Groups booked</Label>
          <Input
            id="groups"
            type="number"
            min={0}
            value={form.groups_booked}
            onChange={(e) =>
              setForm((f) => ({ ...f, groups_booked: e.target.value }))
            }
          />
        </div>
        <div>
          <Label htmlFor="energy">Energy score</Label>
          <Input
            id="energy"
            type="number"
            min={0}
            max={10}
            step="0.1"
            value={form.energy_score}
            onChange={(e) =>
              setForm((f) => ({ ...f, energy_score: e.target.value }))
            }
          />
        </div>
        <div>
          <Label htmlFor="travel">Travel minutes</Label>
          <Input
            id="travel"
            type="number"
            min={0}
            value={form.travel_minutes}
            onChange={(e) =>
              setForm((f) => ({ ...f, travel_minutes: e.target.value }))
            }
          />
        </div>
        <div>
          <Label htmlFor="crowd">Crowd label</Label>
          <Input
            id="crowd"
            value={form.crowd_label}
            onChange={(e) => setForm((f) => ({ ...f, crowd_label: e.target.value }))}
            placeholder="25–35"
          />
        </div>
        <div>
          <Label htmlFor="template">Template</Label>
          <select
            id="template"
            className="w-full rounded-lg border border-wtva-dark-300 bg-wtva-card px-3 py-2 text-sm"
            value={form.template_key}
            onChange={(e) => setForm((f) => ({ ...f, template_key: e.target.value }))}
          >
            {PACKAGE_TEMPLATES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            className="w-full rounded-lg border border-wtva-dark-300 bg-wtva-card px-3 py-2 text-sm"
            value={form.status}
            onChange={(e) =>
              setForm((f) => ({ ...f, status: e.target.value as NightPackageFormData["status"] }))
            }
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          {form.status === "published" && (
            <p className="mt-1 text-xs text-amber-700">
              Checkout is blocked until every stop venue has active Stripe Connect
              (charges + payouts enabled).
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="starts_on">Package date (optional)</Label>
          <Input
            id="starts_on"
            type="date"
            value={form.starts_on}
            onChange={(e) => setForm((f) => ({ ...f, starts_on: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="image_url">Image URL</Label>
          <Input
            id="image_url"
            value={form.image_url}
            onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="party_min">Party size min</Label>
          <Input
            id="party_min"
            type="number"
            min={1}
            value={form.party_size_min}
            onChange={(e) =>
              setForm((f) => ({ ...f, party_size_min: Number(e.target.value) || 1 }))
            }
          />
        </div>
        <div>
          <Label htmlFor="party_max">Party size max</Label>
          <Input
            id="party_max"
            type="number"
            min={1}
            value={form.party_size_max}
            onChange={(e) =>
              setForm((f) => ({ ...f, party_size_max: Number(e.target.value) || 1 }))
            }
          />
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={form.is_featured}
            onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))}
          />
          Featured / Trending on Curated Vibes
        </label>
      </div>

      <section className="space-y-3 rounded-xl border border-wtva-dark-300 bg-wtva-card p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Stops in this flow</h2>
          <p className="text-sm text-wtva-muted">Subtotal {formatCents(subtotal)} / person</p>
        </div>

        {form.stop_offer_ids.length > 0 && (
          <ol className="space-y-2">
            {form.stop_offer_ids.map((id, index) => {
              const stop = approvedStops.find((s) => s.id === id);
              if (!stop) return null;
              return (
                <li
                  key={id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-wtva-dark-300 px-3 py-2"
                >
                  <span className="text-xs font-bold text-wtva-muted">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {slotTypeLabel(stop.slot_type)} · {stop.title}
                    </p>
                    <p className="text-xs text-wtva-muted">
                      {stop.venue?.name} · {formatCents(stop.price_cents)}
                    </p>
                  </div>
                  <Input
                    className="w-36"
                    placeholder="Time label"
                    value={form.scheduled_labels[index] ?? ""}
                    onChange={(e) =>
                      setForm((prev) => {
                        const labels = [...prev.scheduled_labels];
                        labels[index] = e.target.value;
                        return { ...prev, scheduled_labels: labels };
                      })
                    }
                  />
                  <Button type="button" variant="secondary" className="px-3 py-1" onClick={() => moveStop(index, -1)}>
                    ↑
                  </Button>
                  <Button type="button" variant="secondary" className="px-3 py-1" onClick={() => moveStop(index, 1)}>
                    ↓
                  </Button>
                  <Button type="button" variant="secondary" className="px-3 py-1" onClick={() => toggleStop(id)}>
                    Remove
                  </Button>
                </li>
              );
            })}
          </ol>
        )}

        <div className="max-h-72 space-y-2 overflow-y-auto">
          {approvedStops.map((stop) => {
            const selected = form.stop_offer_ids.includes(stop.id);
            return (
              <label
                key={stop.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-wtva-dark-300 px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleStop(stop.id)}
                  className="mt-1"
                />
                <span className="min-w-0 flex-1">
                  <span className="font-semibold">
                    {slotTypeLabel(stop.slot_type)} · {stop.title}
                  </span>
                  <span className="block text-xs text-wtva-muted">
                    {stop.venue?.name} · {formatCents(stop.price_cents)}
                    {stop.arrival_window ? ` · ${stop.arrival_window}` : ""}
                  </span>
                </span>
              </label>
            );
          })}
          {approvedStops.length === 0 && (
            <p className="text-sm text-wtva-muted">
              No approved venue stops yet. Approve pending stops first, or ask venues to submit
              package offers.
            </p>
          )}
        </div>
      </section>

      <div className="flex gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : initial?.id ? "Update package" : "Create package"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/night-packages")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
