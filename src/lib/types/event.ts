import type { EventRecurrenceInput } from "@/lib/event-occurrences";
import type { TicketTierInput } from "@/lib/types/ticket";

export const EVENT_TYPES = [
  "Day Party",
  "Night Party",
  "After Hours",
  "Brunch / Daytime",
  "Happy Hours",
  "Live Music / DJ",
  "Hookah Vibes",
  "25 and Over",
  "30 and Over",
  "Upscale",
  "Private Event",
  "Other",
] as const;

export const DEFAULT_EVENT_TYPE = "Night Party" as const;

export const EVENT_STATUSES = [
  "draft",
  "pending_review",
  "published",
  "cancelled",
] as const;

export type { EventRecurrenceInput };

export interface EventFormData {
  id?: string;
  venue_id: string;
  title: string;
  description: string;
  event_type: string;
  neighborhood: string;
  starts_at: string;
  ends_at: string;
  image_url: string;
  ticket_url: string;
  status: "draft" | "pending_review" | "published" | "cancelled";
  featured: boolean;
  homepage_featured: boolean;
  featured_starts_at?: string;
  featured_ends_at?: string;
  additional_dates?: string[];
  recurrence?: EventRecurrenceInput | null;
  ticket_tiers?: TicketTierInput[];
}
