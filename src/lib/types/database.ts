export type UserRole = "customer" | "venueOwner" | "admin" | "driver" | "promoter";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  profile_image_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
  total_points?: number;
}

export interface PlatformSettings {
  id: number;
  venue_submission_fee: number;
  venue_listing_months: number;
  event_submission_fee: number;
  event_ticket_commission_pct: number;
  vip_commission_pct: number;
  driver_listing_fee: number;
  driver_listing_months: number;
  driver_booking_commission_pct: number;
  featured_event_price: number;
  featured_event_days: number;
  featured_event_max_slots: number;
  auto_approve_venues: boolean;
  auto_approve_events: boolean;
  require_payment: boolean;
  updated_at: string;
}

export interface EventRow {
  id: string;
  venue_id: string | null;
  title: string;
  description: string | null;
  event_type: string;
  neighborhood: string | null;
  starts_at: string;
  ends_at: string | null;
  image_url: string | null;
  status: string;
  featured: boolean | null;
  homepage_featured: boolean;
  featured_starts_at: string | null;
  featured_ends_at: string | null;
  created_at: string;
  venue?: { name: string } | null;
}

export interface VipPackageRow {
  id: string;
  venue_id: string;
  event_id?: string | null;
  package_name: string;
  description: string | null;
  price: number;
  benefits?: string[] | unknown;
  image_url?: string | null;
  is_active: boolean | null;
  venue?: { name: string } | null;
}

export interface DashboardStats {
  totalVenues: number;
  totalEvents: number | null;
  pendingSubmissions: number;
  totalUsers: number;
  featuredVenues: number | null;
  featuredEvents: number | null;
  totalEarnings: number | null;
  pendingPayments: number | null;
  pendingVerification: number;
}
