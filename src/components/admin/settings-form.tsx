"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { PlatformSettings } from "@/lib/types/database";

const sections = [
  { id: "venues", label: "Venues" },
  { id: "events", label: "Events" },
  { id: "commissions", label: "Commissions" },
  { id: "featured", label: "Featured" },
  { id: "drivers", label: "Drivers" },
  { id: "approvals", label: "Approvals" },
] as const;

function SectionCard({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-2xl border border-wtva-dark-300 bg-wtva-card p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-wtva-muted">{description}</p>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

export function SettingsForm({ initial }: { initial: PlatformSettings }) {
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("venues");

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
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex flex-col gap-8 lg:flex-row">
        <nav className="lg:sticky lg:top-6 lg:w-44 lg:shrink-0 lg:self-start">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-wtva-subtle">
            Jump to
          </p>
          <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={() => setActiveSection(s.id)}
                  className={cn(
                    "block whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors",
                    activeSection === s.id
                      ? "bg-wtva-dark-400 font-medium text-foreground"
                      : "text-wtva-muted hover:bg-wtva-dark-400/70 hover:text-foreground",
                  )}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 flex-1 space-y-5">
          <SectionCard
            id="venues"
            title="Venue listings"
            description="Owners pay once to be listed for a set duration. Admin review before going live."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="venue_fee">Listing fee ($)</Label>
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
                <Label htmlFor="venue_listing_months">Duration (months)</Label>
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
              </div>
            </div>
          </SectionCard>

          <SectionCard
            id="events"
            title="Event posting"
            description="Fee to publish instantly without admin approval. Unpaid events stay in review unless auto-approve is on."
          >
            <div className="max-w-xs">
              <Label htmlFor="event_fee">Submission fee ($)</Label>
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
          </SectionCard>

          <SectionCard
            id="commissions"
            title="Marketplace commissions"
            description="Percentage WTVA keeps before the rest goes to venue Connect accounts."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="event_ticket_commission">Ticket (%)</Label>
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
                <Label htmlFor="vip_commission">VIP (%)</Label>
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
                <Label htmlFor="night_package_commission">Vibe fee (%)</Label>
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
              </div>
            </div>
          </SectionCard>

          <SectionCard
            id="featured"
            title="Homepage featured events"
            description="Pricing for paid homepage featured placements."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="featured_event_price">Price ($)</Label>
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
                <Label htmlFor="featured_event_days">Duration (days)</Label>
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
                <Label htmlFor="featured_event_max_slots">Max slots</Label>
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
          </SectionCard>

          <SectionCard
            id="drivers"
            title="Driver / limo listings"
            description="Listing fee, duration, and booking commission."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="driver_listing_fee">Listing fee ($)</Label>
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
                <Label htmlFor="driver_listing_months">Duration (months)</Label>
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
              </div>
            </div>
          </SectionCard>

          <SectionCard
            id="approvals"
            title="Approval rules"
            description="Control when listings publish without manual review."
          >
            <div className="space-y-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-wtva-dark-300 px-4 py-3 text-sm hover:bg-wtva-dark-400/60">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={form.auto_approve_venues}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      auto_approve_venues: e.target.checked,
                    }))
                  }
                />
                <span>
                  <span className="font-medium">Auto-approve venues</span>
                  <span className="mt-0.5 block text-wtva-muted">
                    Skip the review queue for new venue listings.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-wtva-dark-300 px-4 py-3 text-sm hover:bg-wtva-dark-400/60">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={form.auto_approve_events}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      auto_approve_events: e.target.checked,
                    }))
                  }
                />
                <span>
                  <span className="font-medium">Auto-approve events</span>
                  <span className="mt-0.5 block text-wtva-muted">
                    Publish unpaid events without admin review.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-wtva-dark-300 px-4 py-3 text-sm hover:bg-wtva-dark-400/60">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={form.require_payment}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      require_payment: e.target.checked,
                    }))
                  }
                />
                <span>
                  <span className="font-medium">Require payment before submission</span>
                  <span className="mt-0.5 block text-wtva-muted">
                    Disable free submission when fees apply.
                  </span>
                </span>
              </label>
            </div>
          </SectionCard>

          <div className="sticky bottom-4 z-10 flex items-center justify-between gap-4 rounded-2xl border border-wtva-dark-300 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
            <p className="text-sm text-wtva-muted">
              {saved ? (
                <span className="text-emerald-700">Settings saved.</span>
              ) : (
                "Changes apply after you save."
              )}
            </p>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : "Save settings"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
