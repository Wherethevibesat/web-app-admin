import { createAdminClient } from "@/lib/supabase/admin";

export type DriverCompanyRow = {
  id: string;
  owner_id: string;
  company_name: string;
  city: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: string;
  published: boolean;
  listing_paid_at: string | null;
  listing_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function listDriverCompanies(search?: string): Promise<DriverCompanyRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("driver_companies")
    .select(
      "id, owner_id, company_name, city, contact_email, contact_phone, status, published, listing_paid_at, listing_expires_at, created_at, updated_at",
    )
    .order("company_name");

  if (error) throw error;

  let rows = (data ?? []) as DriverCompanyRow[];
  if (search?.trim()) {
    const q = search.trim().toLowerCase();
    rows = rows.filter(
      (d) =>
        d.company_name.toLowerCase().includes(q) ||
        (d.city ?? "").toLowerCase().includes(q) ||
        (d.contact_email ?? "").toLowerCase().includes(q),
    );
  }
  return rows;
}

export async function setDriverCompanyPublished(companyId: string, published: boolean) {
  const admin = createAdminClient();
  const patch: Record<string, unknown> = {
    published,
    updated_at: new Date().toISOString(),
  };
  if (published) {
    patch.status = "published";
  } else {
    patch.status = "suspended";
  }
  const { error } = await admin.from("driver_companies").update(patch).eq("id", companyId);
  if (error) throw error;
}

export type DriverCompanySubmission = Pick<
  DriverCompanyRow,
  "id" | "owner_id" | "company_name" | "city" | "contact_email" | "status" | "published" | "listing_expires_at" | "created_at"
>;

export async function listPendingDriverCompanies(): Promise<DriverCompanySubmission[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("driver_companies")
    .select("id, owner_id, company_name, city, contact_email, status, published, listing_expires_at, created_at")
    .eq("status", "pending_review")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DriverCompanySubmission[];
}
