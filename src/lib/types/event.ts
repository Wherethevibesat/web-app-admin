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
  status: "draft" | "pending_review" | "published" | "cancelled";
  featured: boolean;
}

export const EVENT_TYPES = [
  "Day Party",
  "Night Party",
  "After Hours",
  "Brunch / Daytime",
  "Live Music / DJ",
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
