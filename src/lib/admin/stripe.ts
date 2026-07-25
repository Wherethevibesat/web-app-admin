import { createAdminClient } from "@/lib/supabase/admin";
import { adminPortalUrl } from "@/lib/email/send";
import { getStripeClient } from "@/lib/admin/stripe-payout";

export interface StripeSettings {
  id: number;
  publishable_key: string | null;
  updated_at: string;
}

export interface StripeAccountRow {
  id: string;
  user_id: string;
  stripe_account_id: string;
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
    .select(
      "id, user_id, stripe_account_id, account_name, email, last4, status, is_default, connected_at",
    )
    .order("connected_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as StripeAccountRow[];
}

export async function disconnectStripeAccountById(accountRowId: string): Promise<{
  ok: true;
  userId: string;
}> {
  const admin = createAdminClient();
  const stripe = getStripeClient();
  if (!stripe) throw new Error("STRIPE_SECRET_KEY is not configured.");

  const { data: row, error } = await admin
    .from("stripe_accounts")
    .select("id, user_id, stripe_account_id")
    .eq("id", accountRowId)
    .maybeSingle();
  if (error) throw error;
  if (!row) throw new Error("Connected account not found.");

  try {
    await stripe.accounts.del(row.stripe_account_id as string);
  } catch (err) {
    console.warn(
      "[admin-stripe] could not delete Connect account",
      row.stripe_account_id,
      err,
    );
  }

  const { error: delError } = await admin
    .from("stripe_accounts")
    .delete()
    .eq("id", accountRowId);
  if (delError) throw delError;

  return { ok: true, userId: row.user_id as string };
}

/** Create a Stripe onboarding link for an existing linked account (or recreate if missing). */
export async function createStripeReconnectLink(accountRowId: string): Promise<string> {
  const admin = createAdminClient();
  const stripe = getStripeClient();
  if (!stripe) throw new Error("STRIPE_SECRET_KEY is not configured.");

  const { data: row, error } = await admin
    .from("stripe_accounts")
    .select("id, user_id, stripe_account_id, email, account_name")
    .eq("id", accountRowId)
    .maybeSingle();
  if (error) throw error;
  if (!row) throw new Error("Connected account not found.");

  let accountId = row.stripe_account_id as string;
  try {
    const existing = await stripe.accounts.retrieve(accountId);
    if ("deleted" in existing && existing.deleted) {
      throw new Error("deleted");
    }
  } catch {
    const created = await stripe.accounts.create({
      type: "express",
      country: "US",
      email: (row.email as string | null) ?? undefined,
      metadata: {
        user_id: row.user_id as string,
        role: "venueOwner",
        reconnected_by: "admin",
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
    accountId = created.id;
    const now = new Date().toISOString();
    await admin
      .from("stripe_accounts")
      .update({
        stripe_account_id: accountId,
        status: "pending",
        updated_at: now,
        connected_at: now,
      })
      .eq("id", accountRowId);
  }

  const returnUrl = adminPortalUrl("/settings/stripe/accounts?stripe=return");
  const refreshUrl = adminPortalUrl("/settings/stripe/accounts?stripe=refresh");
  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: refreshUrl,
    return_url: returnUrl,
  });
  return link.url;
}

/** Start Connect for a user who has no stripe_accounts row (e.g. from venues). */
export async function createStripeConnectLinkForUser(userId: string): Promise<string> {
  const admin = createAdminClient();
  const stripe = getStripeClient();
  if (!stripe) throw new Error("STRIPE_SECRET_KEY is not configured.");

  const { data: user } = await admin
    .from("users")
    .select("id, email, name")
    .eq("id", userId)
    .maybeSingle();
  if (!user) throw new Error("User not found.");

  const { data: existing } = await admin
    .from("stripe_accounts")
    .select("id")
    .eq("user_id", userId)
    .order("connected_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return createStripeReconnectLink(existing.id as string);
  }

  const account = await stripe.accounts.create({
    type: "express",
    country: "US",
    email: (user.email as string | null) ?? undefined,
    metadata: {
      user_id: userId,
      role: "venueOwner",
      connected_by: "admin",
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });

  const now = new Date().toISOString();
  const { data: inserted, error } = await admin
    .from("stripe_accounts")
    .insert({
      user_id: userId,
      stripe_account_id: account.id,
      account_name:
        (user.name as string | null)?.trim() ||
        (user.email as string | null) ||
        "Stripe payouts",
      email: (user.email as string | null) ?? null,
      account_type: "express",
      is_default: true,
      status: "pending",
      connected_at: now,
      updated_at: now,
    })
    .select("id")
    .single();
  if (error) throw error;

  return createStripeReconnectLink(inserted.id as string);
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
