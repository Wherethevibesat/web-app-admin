import { createAdminClient } from "@/lib/supabase/admin";

export interface StripeSettings {
  id: number;
  publishable_key: string | null;
  updated_at: string;
}

export interface StripeAccountRow {
  id: string;
  account_name: string;
  email: string | null;
  last4: string | null;
  status: string | null;
  is_default: boolean | null;
  connected_at: string;
}

export interface WithdrawalRow {
  id: string;
  amount: number;
  status: string;
  stripe_transfer_id: string | null;
  created_at: string;
}

export async function getStripeSettings(): Promise<StripeSettings> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("stripe_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) {
    return { id: 1, publishable_key: null, updated_at: new Date().toISOString() };
  }
  return data as StripeSettings;
}

export async function saveStripePublishableKey(publishable_key: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("stripe_settings").upsert({
    id: 1,
    publishable_key,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function listStripeAccounts(): Promise<StripeAccountRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("stripe_accounts")
    .select("id, account_name, email, last4, status, is_default, connected_at")
    .order("connected_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as StripeAccountRow[];
}

export async function listWithdrawals(): Promise<WithdrawalRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("withdrawals")
    .select("id, amount, status, stripe_transfer_id, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as WithdrawalRow[];
}

export async function createWithdrawal(params: {
  amount: number;
  created_by: string;
  notes?: string;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("withdrawals")
    .insert({
      amount: params.amount,
      created_by: params.created_by,
      notes: params.notes ?? null,
      status: "pending",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function listTransactions(limit = 100) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_transactions")
    .select("id, type, amount, description, status, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function getVerificationSignedUrl(
  documentPath: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("business-verification")
    .createSignedUrl(documentPath, 3600);
  if (error) {
    console.error("signed url", error);
    return null;
  }
  return data.signedUrl;
}
