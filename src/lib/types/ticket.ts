export type TicketTierInput = {
  id?: string;
  name: string;
  description?: string;
  price_cents: number;
  capacity?: number | null;
};

export const FREE_RSVP_TIER_NAME = "Free RSVP";

export function normalizeTicketTiers(tiers: TicketTierInput[]): TicketTierInput[] {
  const cleaned = tiers
    .map((t, index) => ({
      ...t,
      name: t.name.trim() || (index === 0 ? FREE_RSVP_TIER_NAME : "Ticket"),
      price_cents: Math.max(0, Math.round(t.price_cents)),
      capacity: t.capacity != null && t.capacity > 0 ? Math.floor(t.capacity) : null,
    }))
    .filter((t, i) => i === 0 || t.name.length > 0);

  if (cleaned.length === 0) {
    return [{ name: FREE_RSVP_TIER_NAME, price_cents: 0, capacity: null }];
  }

  const freeIdx = cleaned.findIndex((t) => t.price_cents === 0);
  if (freeIdx <= 0) {
    cleaned[0] = { ...cleaned[0], name: FREE_RSVP_TIER_NAME, price_cents: 0 };
    return cleaned;
  }

  const [freeTier] = cleaned.splice(freeIdx, 1);
  return [{ ...freeTier, name: FREE_RSVP_TIER_NAME, price_cents: 0 }, ...cleaned];
}

export function formatTierPrice(cents: number): string {
  if (cents <= 0) return "Free";
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}
