import { createAdminClient } from "@/lib/supabase/admin";

export type EventInterestRow = {
  id: string;
  email: string;
  name: string | null;
  city: string | null;
  neighborhood: string | null;
  vibe: string | null;
  note: string | null;
  source: string;
  event_id: string | null;
  venue_id: string | null;
  created_at: string;
};

export async function listEventInterest(limit = 200): Promise<EventInterestRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("event_interest")
    .select(
      "id, email, name, city, neighborhood, vibe, note, source, event_id, venue_id, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as EventInterestRow[];
}
