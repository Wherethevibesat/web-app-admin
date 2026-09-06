export interface EventGuideRow {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  city: string;
  starts_on: string;
  ends_on: string;
  cover_image_url: string | null;
  posted_by_name: string;
  published: boolean;
  featured_on_homepage: boolean;
  created_at: string;
  updated_at: string;
  item_count?: number;
}

export interface EventGuideItemRow {
  guide_id: string;
  event_id: string;
  sort_order: number;
  event?: {
    id: string;
    title: string;
    starts_at: string;
    ends_at: string | null;
    image_url: string | null;
    ticket_url: string | null;
    status: string;
    venue?: { name: string } | null;
  } | null;
}

export interface EventGuideFormData {
  id?: string;
  slug: string;
  title: string;
  subtitle: string;
  city: string;
  starts_on: string;
  ends_on: string;
  cover_image_url: string;
  posted_by_name: string;
  published: boolean;
  featured_on_homepage: boolean;
  event_ids: string[];
}
