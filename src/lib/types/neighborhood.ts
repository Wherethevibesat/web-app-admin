export const DEFAULT_CITY = "Houston";

export interface NeighborhoodRow {
  id: string;
  city: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NeighborhoodFormData {
  id?: string;
  city: string;
  name: string;
  slug?: string;
  description: string;
  sort_order: number;
  is_active: boolean;
}
