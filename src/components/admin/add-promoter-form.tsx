"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import type { PromoterUserRow } from "@/lib/admin/promoters";

type VenueOption = { id: string; name: string };

export function AddPromoterForm({
  venues,
  promoters,
}: {
  venues: VenueOption[];
  promoters: PromoterUserRow[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"email" | "existing">("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [promoterId, setPromoterId] = useState("");
  const [venueId, setVenueId] = useState(venues[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/admin/promoter-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: mode === "email" ? email : undefined,
        name: mode === "email" ? name : undefined,
        promoterId: mode === "existing" ? promoterId : undefined,
        venueId,
        status: "approved",
      }),
    });

    const body = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setError(body.error ?? "Failed to add promoter");
      return;
    }

    setSuccess(
      mode === "email"
        ? "Promoter added and linked to venue. They can sign in with password reset at the business portal."
        : "Promoter linked to venue.",
    );
    setEmail("");
    setName("");
    router.refresh();
  }

  return (
    <form
      onSubmit={submit}
      className="mb-8 rounded-xl border border-wtva-dark-300 bg-wtva-card p-5"
    >
      <h2 className="text-lg font-semibold">Add promoter</h2>
      <p className="mt-1 text-sm text-wtva-muted">
        Create a promoter account by email or link an existing promoter to a venue.
      </p>

      <div className="mt-4 flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setMode("email")}
          className={`rounded-lg px-3 py-1.5 ${mode === "email" ? "bg-accent-gradient text-white shadow-accent" : "border border-wtva-dark-300"}`}
        >
          By email
        </button>
        <button
          type="button"
          onClick={() => setMode("existing")}
          className={`rounded-lg px-3 py-1.5 ${mode === "existing" ? "bg-accent-gradient text-white shadow-accent" : "border border-wtva-dark-300"}`}
        >
          Existing promoter
        </button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {mode === "email" ? (
          <>
            <label className="block text-sm">
              <span className="text-wtva-muted">Email</span>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="promoter@example.com"
                className="mt-1"
              />
            </label>
            <label className="block text-sm">
              <span className="text-wtva-muted">Name (optional)</span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Display name"
                className="mt-1"
              />
            </label>
          </>
        ) : (
          <label className="block text-sm sm:col-span-2">
            <span className="text-wtva-muted">Promoter</span>
            <Select
              required
              value={promoterId}
              onChange={(e) => setPromoterId(e.target.value)}
              className="mt-1 w-full"
            >
              <option value="">Select promoter…</option>
              {promoters.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.email})
                </option>
              ))}
            </Select>
            {promoters.length === 0 && (
              <span className="mt-1 block text-xs text-wtva-muted">
                No promoters yet — use &quot;By email&quot; to create one.
              </span>
            )}
          </label>
        )}

        <label className="block text-sm sm:col-span-2">
          <span className="text-wtva-muted">Venue</span>
          <Select
            required
            value={venueId}
            onChange={(e) => setVenueId(e.target.value)}
            className="mt-1 w-full"
          >
            {venues.length === 0 ? (
              <option value="">No venues</option>
            ) : (
              venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))
            )}
          </Select>
        </label>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-400">{error}</p>
      )}
      {success && (
        <p className="mt-3 text-sm text-green-400">{success}</p>
      )}

      <Button type="submit" disabled={busy || !venueId} className="mt-4">
        {busy ? "Adding…" : "Add & approve link"}
      </Button>
    </form>
  );
}
