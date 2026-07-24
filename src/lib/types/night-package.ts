export const PACKAGE_SLOT_TYPES = [
  "brunch",
  "day_party",
  "lounge",
  "night",
  "after_hours",
  "other",
] as const;

export type PackageSlotType = (typeof PACKAGE_SLOT_TYPES)[number];

export const PACKAGE_TEMPLATES = [
  { key: "sunday_funday", label: "Sunday Funday" },
  { key: "date_night", label: "Date Night" },
  { key: "birthday", label: "Birthday" },
  { key: "out_of_town", label: "Out of Town" },
  { key: "lit_night", label: "Lit Night" },
  { key: "custom", label: "Custom" },
] as const;

export type StopOfferStatus = "draft" | "pending_review" | "approved" | "rejected" | "archived";
export type NightPackageStatus = "draft" | "published" | "archived";

export type PackageStopOfferRow = {
  id: string;
  venue_id: string;
  title: string;
  description: string;
  slot_type: PackageSlotType;
  price_cents: number;
  inclusions: string[];
  capacity: number | null;
  arrival_window: string | null;
  contract_accepted: boolean;
  status: StopOfferStatus;
  is_active: boolean;
  image_url: string | null;
  created_at: string;
  venue?: { id: string; name: string } | null;
};

export type NightPackageStopRow = {
  id: string;
  package_id: string;
  stop_offer_id: string;
  sort_order: number;
  scheduled_label: string | null;
  notes: string;
  stop_offer?: PackageStopOfferRow | null;
};

export type NightPackageRow = {
  id: string;
  slug: string | null;
  title: string;
  subtitle: string;
  description: string;
  template_key: string | null;
  city: string;
  image_url: string | null;
  status: NightPackageStatus;
  starts_on: string | null;
  party_size_min: number;
  party_size_max: number;
  sort_order: number;
  is_featured: boolean;
  created_at: string;
  stops?: NightPackageStopRow[];
  subtotal_cents?: number;
};

export type NightPackageFormData = {
  id?: string;
  title: string;
  subtitle: string;
  description: string;
  template_key: string;
  city: string;
  image_url: string;
  status: NightPackageStatus;
  starts_on: string;
  party_size_min: number;
  party_size_max: number;
  sort_order: number;
  is_featured: boolean;
  stop_offer_ids: string[];
  scheduled_labels: string[];
};

export function slotTypeLabel(slot: string): string {
  switch (slot) {
    case "brunch":
      return "Brunch";
    case "day_party":
      return "Day party";
    case "lounge":
      return "Lounge";
    case "night":
      return "Night";
    case "after_hours":
      return "After hours";
    default:
      return "Other";
  }
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
