export type SubscriptionTier = "silver" | "gold" | "platinum";
export type VerificationStatus = "none" | "pending" | "approved" | "rejected";

export interface VenueRow {
  id: string;
  name: string;
  venue_type: string;
  address: string | null;
  image_url: string | null;
  description: string | null;
  rating: number | null;
  check_in_count: number | null;
  is_open: boolean | null;
  hours_label: string | null;
  latitude: number | null;
  longitude: number | null;
  owner_id: string | null;
  phone: string | null;
  categories: string[] | null;
  subscription_tier: SubscriptionTier | null;
  verified: boolean | null;
  verification_status?: VerificationStatus | null;
  verification_document_path?: string | null;
  featured?: boolean | null;
  published?: boolean | null;
  listing_paid_at?: string | null;
  listing_expires_at?: string | null;
  neighborhood?: string | null;
  created_at: string;
  updated_at: string;
  owner?: { name: string; email: string } | null;
}

export interface VenueFormData {
  id?: string;
  name: string;
  venue_type: string;
  address: string;
  neighborhood: string;
  description: string;
  image_url: string;
  phone: string;
  hours_label: string;
  subscription_tier: SubscriptionTier;
  verified: boolean;
  featured: boolean;
  published: boolean;
  is_open: boolean;
  latitude: string;
  longitude: string;
  owner_id: string;
}

export const VENUE_TYPES = [
  "Nightclub",
  "Lounge",
  "Bar",
  "Restaurant",
  "Speakeasy",
  "Rooftop",
  "After Hours Club",
  "Hookah Lounge",
] as const;

export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  "silver",
  "gold",
  "platinum",
];
