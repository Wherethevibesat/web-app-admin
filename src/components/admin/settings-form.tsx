"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { PlatformSettings } from "@/lib/types/database";

export function SettingsForm({ initial }: { initial: PlatformSettings }) {
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        venue_submission_fee: form.venue_submission_fee,
        event_submission_fee: form.event_submission_fee,
        auto_approve_venues: form.auto_approve_venues,
        auto_approve_events: form.auto_approve_events,
        require_payment: form.require_payment,
      }),
    });
    setLoading(false);
    if (res.ok) setSaved(true);
    else alert("Failed to save settings");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-6">
      <div className="rounded-xl border border-wtva-dark-300 bg-wtva-card p-6 space-y-4">
        <h2 className="font-semibold">Submission fees</h2>
        <div>
          <Label htmlFor="venue_fee">Venue submission fee ($)</Label>
          <Input
            id="venue_fee"
            type="number"
            min={0}
            step={1}
            value={form.venue_submission_fee}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                venue_submission_fee: Number(e.target.value),
              }))
            }
          />
        </div>
        <div>
          <Label htmlFor="event_fee">Event submission fee ($)</Label>
          <Input
            id="event_fee"
            type="number"
            min={0}
            step={1}
            value={form.event_submission_fee}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                event_submission_fee: Number(e.target.value),
              }))
            }
          />
        </div>
      </div>

      <div className="rounded-xl border border-wtva-dark-300 bg-wtva-card p-6 space-y-3">
        <h2 className="font-semibold">Approval rules</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.auto_approve_venues}
            onChange={(e) =>
              setForm((f) => ({ ...f, auto_approve_venues: e.target.checked }))
            }
          />
          Auto-approve venues
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.auto_approve_events}
            onChange={(e) =>
              setForm((f) => ({ ...f, auto_approve_events: e.target.checked }))
            }
          />
          Auto-approve events
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.require_payment}
            onChange={(e) =>
              setForm((f) => ({ ...f, require_payment: e.target.checked }))
            }
          />
          Require payment before submission
        </label>
      </div>

      {saved && (
        <p className="text-sm text-green-400">Settings saved.</p>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
