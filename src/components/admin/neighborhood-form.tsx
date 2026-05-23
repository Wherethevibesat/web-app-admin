"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { DEFAULT_CITY, type NeighborhoodFormData, type NeighborhoodRow } from "@/lib/types/neighborhood";
import { slugify } from "@/lib/utils";

function toForm(row?: NeighborhoodRow | null): NeighborhoodFormData {
  return {
    id: row?.id,
    city: row?.city ?? DEFAULT_CITY,
    name: row?.name ?? "",
    slug: row?.slug ?? "",
    description: row?.description ?? "",
    sort_order: row?.sort_order ?? 0,
    is_active: row?.is_active ?? true,
  };
}

export function NeighborhoodForm({ neighborhood }: { neighborhood?: NeighborhoodRow | null }) {
  const router = useRouter();
  const [form, setForm] = useState(() => toForm(neighborhood));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewSlug = useMemo(
    () => (form.slug?.trim() || slugify(form.name)).toLowerCase(),
    [form.name, form.slug],
  );

  function update<K extends keyof NeighborhoodFormData>(key: K, value: NeighborhoodFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/neighborhoods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        slug: previewSlug,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to save");
      return;
    }
    router.push("/neighborhoods");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
      <div>
        <Label htmlFor="city">City</Label>
        <Input id="city" value={form.city} readOnly className="opacity-70" />
        <p className="mt-1 text-xs text-wtva-muted">
          Multi-city support coming soon. Houston only for now.
        </p>
      </div>
      <div>
        <Label htmlFor="name">Neighborhood name</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="e.g. Midtown"
          required
        />
      </div>
      <div>
        <Label htmlFor="slug">URL slug</Label>
        <Input
          id="slug"
          value={form.slug ?? ""}
          onChange={(e) => update("slug", e.target.value)}
          placeholder={previewSlug || "auto-generated-from-name"}
        />
        <p className="mt-1 text-xs text-wtva-muted">
          Customer link: /neighborhoods/{previewSlug || "…"}
        </p>
      </div>
      <div>
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          rows={3}
          placeholder="Short blurb for customers browsing this area"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="sort_order">Sort order</Label>
          <Input
            id="sort_order"
            type="number"
            value={form.sort_order}
            onChange={(e) => update("sort_order", Number(e.target.value) || 0)}
          />
          <p className="mt-1 text-xs text-wtva-muted">Lower numbers appear first in lists.</p>
        </div>
        <div className="flex items-end pb-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => update("is_active", e.target.checked)}
              className="h-4 w-4 rounded border-wtva-dark-300"
            />
            Active (visible to customers)
          </label>
        </div>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : neighborhood ? "Save changes" : "Add neighborhood"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/neighborhoods")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
