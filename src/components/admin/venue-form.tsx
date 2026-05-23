"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { NeighborhoodSelect } from "@/components/admin/neighborhood-select";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import type { NeighborhoodRow } from "@/lib/types/neighborhood";
import {
  SUBSCRIPTION_TIERS,
  VENUE_TYPES,
  type VenueFormData,
  type VenueRow,
} from "@/lib/types/venue";

function toForm(venue?: VenueRow | null): VenueFormData {
  return {
    id: venue?.id,
    name: venue?.name ?? "",
    venue_type: venue?.venue_type ?? "Nightclub",
    address: venue?.address ?? "",
    neighborhood: venue?.neighborhood ?? "",
    description: venue?.description ?? "",
    image_url: venue?.image_url ?? "",
    phone: venue?.phone ?? "",
    hours_label: venue?.hours_label ?? "Open until 2:00 AM",
    subscription_tier: venue?.subscription_tier ?? "gold",
    verified: venue?.verified ?? false,
    featured: venue?.featured ?? false,
    published: venue?.published ?? true,
    is_open: venue?.is_open ?? true,
    latitude: venue?.latitude?.toString() ?? "",
    longitude: venue?.longitude?.toString() ?? "",
    owner_id: venue?.owner_id ?? "",
  };
}

export function VenueForm({
  venue,
  neighborhoods,
}: {
  venue?: VenueRow | null;
  neighborhoods: NeighborhoodRow[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<VenueFormData>(() => toForm(venue));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof VenueFormData>(key: K, value: VenueFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/venues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, id: venue?.id }),
    });

    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to save");
      return;
    }

    router.push("/venues");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
      <div>
        <Label htmlFor="name">Venue name *</Label>
        <Input
          id="name"
          required
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="venue_type">Type *</Label>
          <Select
            id="venue_type"
            value={form.venue_type}
            onChange={(e) => update("venue_type", e.target.value)}
          >
            {VENUE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
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
      </div>

      <div>
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          value={form.address}
          onChange={(e) => update("address", e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={4}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="image_url">Image URL</Label>
        <Input
          id="image_url"
          value={form.image_url}
          onChange={(e) => update("image_url", e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="hours_label">Hours label</Label>
          <Input
            id="hours_label"
            value={form.hours_label}
            onChange={(e) => update("hours_label", e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="subscription_tier">Subscription tier</Label>
        <Select
          id="subscription_tier"
          value={form.subscription_tier}
          onChange={(e) =>
            update("subscription_tier", e.target.value as VenueFormData["subscription_tier"])
          }
        >
          {SUBSCRIPTION_TIERS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="latitude">Latitude</Label>
          <Input
            id="latitude"
            value={form.latitude}
            onChange={(e) => update("latitude", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="longitude">Longitude</Label>
          <Input
            id="longitude"
            value={form.longitude}
            onChange={(e) => update("longitude", e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="owner_id">Owner user ID (UUID)</Label>
        <Input
          id="owner_id"
          value={form.owner_id}
          onChange={(e) => update("owner_id", e.target.value)}
          placeholder="Optional"
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.verified}
            onChange={(e) => update("verified", e.target.checked)}
          />
          Verified
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => update("featured", e.target.checked)}
          />
          Featured
        </label>
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
            checked={form.is_open}
            onChange={(e) => update("is_open", e.target.checked)}
          />
          Open
        </label>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Save venue"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push("/venues")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
