"use client";

import {
  FREE_RSVP_TIER_NAME,
  formatTierPrice,
  normalizeTicketTiers,
  type TicketTierInput,
} from "@/lib/types/ticket";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";

type Props = {
  tiers: TicketTierInput[];
  onChange: (tiers: TicketTierInput[]) => void;
};

export function AdminTicketTiersEditor({ tiers, onChange }: Props) {
  const normalized = normalizeTicketTiers(
    tiers.length ? tiers : [{ name: FREE_RSVP_TIER_NAME, price_cents: 0 }],
  );

  function update(index: number, patch: Partial<TicketTierInput>) {
    const next = normalized.map((t, i) => (i === index ? { ...t, ...patch } : t));
    onChange(normalizeTicketTiers(next));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Tickets & RSVP</Label>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            onChange([
              ...normalized,
              { name: "General Admission", description: "", price_cents: 2000, capacity: null },
            ])
          }
        >
          + Paid tier
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        First tier is always Free RSVP. Add paid tiers with a name, price, and optional description.
      </p>
      {normalized.map((tier, index) => (
        <div key={index} className="rounded-lg border border-border p-3 space-y-2">
          <div className="flex gap-2">
            <Input
              value={tier.name}
              disabled={index === 0}
              onChange={(e) => update(index, { name: e.target.value })}
            />
            {index > 0 && (
              <Button type="button" variant="secondary" onClick={() => onChange(normalized.filter((_, i) => i !== index))}>
                Remove
              </Button>
            )}
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea
              rows={2}
              value={tier.description ?? ""}
              onChange={(e) => update(index, { description: e.target.value })}
              placeholder={
                index === 0 ? "Optional RSVP details for guests" : "What's included with this ticket?"
              }
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Label className="text-xs">
              Price (USD)
              <Input
                type="number"
                min={0}
                step={0.01}
                disabled={index === 0}
                value={index === 0 ? 0 : tier.price_cents / 100}
                onChange={(e) =>
                  update(index, { price_cents: Math.round(Number(e.target.value || 0) * 100) })
                }
              />
            </Label>
            <Label className="text-xs">
              Capacity
              <Input
                type="number"
                min={1}
                value={tier.capacity ?? ""}
                placeholder="Unlimited"
                onChange={(e) =>
                  update(index, { capacity: e.target.value ? Number(e.target.value) : null })
                }
              />
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">{formatTierPrice(tier.price_cents)}</p>
        </div>
      ))}
    </div>
  );
}
