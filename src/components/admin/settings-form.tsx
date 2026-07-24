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
        venue_listing_months: form.venue_listing_months,
        event_submission_fee: form.event_submission_fee,
        event_ticket_commission_pct: form.event_ticket_commission_pct,
        vip_commission_pct: form.vip_commission_pct,
        night_package_commission_pct: form.night_package_commission_pct,
        driver_listing_fee: form.driver_listing_fee,
        driver_listing_months: form.driver_listing_months,
        driver_booking_commission_pct: form.driver_booking_commission_pct,
        featured_event_price: form.featured_event_price,
        featured_event_days: form.featured_event_days,
        featured_event_max_slots: form.featured_event_max_slots,
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
        <h2 className="font-semibold">Venue listings</h2>
        <p className="text-sm text-wtva-muted">
          Venue owners pay once to be listed on the customer app for a set number of months.
          Admin reviews before the venue goes live.
        </p>
        <div>
          <Label htmlFor="venue_fee">Venue listing fee ($)</Label>
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
          <Label htmlFor="venue_listing_months">Listing duration (months)</Label>
          <Input
            id="venue_listing_months"
            type="number"
            min={1}
            step={1}
            value={form.venue_listing_months ?? 3}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                venue_listing_months: Number(e.target.value),
              }))
            }
          />
          <p className="mt-1 text-xs text-wtva-subtle">
            Example: $50 for 3 months - venue must pay again when listing expires.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-wtva-dark-300 bg-wtva-card p-6 space-y-4">
        <h2 className="font-semibold">Event posting</h2>
        <p className="text-sm text-wtva-muted">
          Fee to publish an event instantly without admin approval. Unpaid events stay in the
          review queue unless auto-approve is enabled.
        </p>
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

      <div className="rounded-xl border border-wtva-dark-300 bg-wtva-card p-6 space-y-4">
        <h2 className="font-semibold">Marketplace commissions</h2>
        <p className="text-sm text-wtva-muted">
          Percentage WTVA keeps from venue-owned ticket and VIP sales before Stripe sends the rest
          to the venue owner's connected account.
        </p>
        <div>
          <Label htmlFor="event_ticket_commission">Paid ticket commission (%)</Label>
          <Input
            id="event_ticket_commission"
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={form.event_ticket_commission_pct}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                event_ticket_commission_pct: Number(e.target.value),
              }))
            }
          />
        </div>
        <div>
          <Label htmlFor="vip_commission">VIP commission (%)</Label>
          <Input
            id="vip_commission"
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={form.vip_commission_pct}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                vip_commission_pct: Number(e.target.value),
              }))
            }
          />
        </div>
        <div>
          <Label htmlFor="night_package_commission">Build Your Night service fee (%)</Label>
          <Input
            id="night_package_commission"
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={form.night_package_commission_pct}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                night_package_commission_pct: Number(e.target.value),
              }))
            }
          />
          <p className="mt-1 text-xs text-wtva-muted">
            Added on top of stop prices at guest checkout.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-wtva-dark-300 bg-wtva-card p-6 space-y-4">
        <h2 className="font-semibold">Homepage featured events (paid)</h2>
        <p className="text-sm text-wtva-muted">
          Pricing and duration used when activating paid homepage featured placements.
        </p>
        <div>
          <Label htmlFor="featured_event_price">Featured event price ($)</Label>
          <Input
            id="featured_event_price"
            type="number"
            min={0}
            step={1}
            value={form.featured_event_price}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                featured_event_price: Number(e.target.value),
              }))
            }
          />
        </div>
        <div>
          <Label htmlFor="featured_event_days">Featured duration (days)</Label>
          <Input
            id="featured_event_days"
            type="number"
            min={1}
            step={1}
            value={form.featured_event_days}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                featured_event_days: Number(e.target.value),
              }))
            }
          />
        </div>
        <div>
          <Label htmlFor="featured_event_max_slots">Max concurrent slots</Label>
          <Input
            id="featured_event_max_slots"
            type="number"
            min={1}
            step={1}
            value={form.featured_event_max_slots}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                featured_event_max_slots: Number(e.target.value),
              }))
            }
          />
        </div>
      </div>

      <div className="rounded-xl border border-wtva-dark-300 bg-wtva-card p-6 space-y-4">
        <h2 className="font-semibold">Driver / limo listings</h2>
        <p className="text-sm text-wtva-muted">
          Drivers pay once to be listed for a set number of months. You earn a commission on each
          accepted customer booking.
        </p>
        <div>
          <Label htmlFor="driver_listing_fee">Driver listing fee ($)</Label>
          <Input
            id="driver_listing_fee"
            type="number"
            min={0}
            step={1}
            value={form.driver_listing_fee}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                driver_listing_fee: Number(e.target.value),
              }))
            }
          />
        </div>
        <div>
          <Label htmlFor="driver_listing_months">Listing duration (months)</Label>
          <Input
            id="driver_listing_months"
            type="number"
            min={1}
            step={1}
            value={form.driver_listing_months}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                driver_listing_months: Number(e.target.value),
              }))
            }
          />
          <p className="mt-1 text-xs text-wtva-subtle">
            Example: $50 for 3 months - driver must pay again when listing expires.
          </p>
        </div>
        <div>
          <Label htmlFor="driver_commission">Booking commission (%)</Label>
          <Input
            id="driver_commission"
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={form.driver_booking_commission_pct}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                driver_booking_commission_pct: Number(e.target.value),
              }))
            }
          />
          <p className="mt-1 text-xs text-wtva-subtle">
            Platform share of each paid booking (after driver accepts).
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-wtva-dark-300 bg-wtva-card p-6 space-y-3">
        <h2 className="font-semibold">Approval rules</h2>
        <p className="text-sm text-wtva-muted">
          Paid event posts publish immediately. When payment is required, free submission is
          disabled.
        </p>
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
