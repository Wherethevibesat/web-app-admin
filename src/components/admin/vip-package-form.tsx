"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import type { EventRow } from "@/lib/types/database";
import type { VipPackageRow } from "@/lib/types/database";
import type { VipFormData } from "@/lib/types/vip";
import type { VenueRow } from "@/lib/types/venue";

function toForm(pkg?: VipPackageRow | null): VipFormData {
  const benefits = Array.isArray(pkg?.benefits)
    ? (pkg.benefits as string[])
    : [];
  return {
    id: pkg?.id,
    venue_id: pkg?.venue_id ?? "",
    event_id: pkg?.event_id ?? "",
    package_name: pkg?.package_name ?? "",
    description: pkg?.description ?? "",
    price: Number(pkg?.price ?? 0),
    benefits: benefits.length ? benefits : [""],
    image_url: pkg?.image_url ?? "",
    is_active: pkg?.is_active ?? true,
  };
}

export function VipPackageForm({
  pkg,
  venues,
  events,
}: {
  pkg?: VipPackageRow | null;
  venues: VenueRow[];
  events: EventRow[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(() => toForm(pkg));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof VipFormData>(key: K, value: VipFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateBenefit(i: number, value: string) {
    const next = [...form.benefits];
    next[i] = value;
    update("benefits", next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.venue_id) {
      setError("Select a venue");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/vip-packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        benefits: form.benefits.filter(Boolean),
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to save");
      return;
    }
    router.push("/vip-packages");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
      <div>
        <Label htmlFor="package_name">Package name *</Label>
        <Input id="package_name" required value={form.package_name} onChange={(e) => update("package_name", e.target.value)} />
      </div>
      <div>
        <Label htmlFor="venue_id">Venue *</Label>
        <Select id="venue_id" required value={form.venue_id} onChange={(e) => update("venue_id", e.target.value)}>
          <option value="">— Select —</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="event_id">Linked event (optional)</Label>
        <Select id="event_id" value={form.event_id} onChange={(e) => update("event_id", e.target.value)}>
          <option value="">— None —</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>{ev.title}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="price">Price ($) *</Label>
        <Input id="price" type="number" min={0} step={0.01} required value={form.price} onChange={(e) => update("price", Number(e.target.value))} />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" rows={3} value={form.description} onChange={(e) => update("description", e.target.value)} />
      </div>
      <div>
        <Label>Benefits</Label>
        {form.benefits.map((b, i) => (
          <div key={i} className="mt-2 flex gap-2">
            <Input value={b} onChange={(e) => updateBenefit(i, e.target.value)} placeholder="Benefit description" />
            <Button type="button" variant="ghost" onClick={() => update("benefits", form.benefits.filter((_, j) => j !== i))}>Remove</Button>
          </div>
        ))}
        <Button type="button" variant="secondary" className="mt-2" onClick={() => update("benefits", [...form.benefits, ""])}>Add benefit</Button>
      </div>
      <div>
        <Label htmlFor="image_url">Image URL</Label>
        <Input id="image_url" value={form.image_url} onChange={(e) => update("image_url", e.target.value)} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.is_active} onChange={(e) => update("is_active", e.target.checked)} />
        Active
      </label>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Save package"}</Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/vip-packages")}>Cancel</Button>
      </div>
    </form>
  );
}
