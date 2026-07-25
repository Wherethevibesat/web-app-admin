import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/admin/stripe-payout";

export type FailedVibePayoutRow = {
  id: string;
  order_id: string;
  venue_id: string;
  title: string | null;
  venue_payout_cents: number;
  payout_status: string;
  created_at: string;
  venue_name: string | null;
};

async function getActiveConnectedStripeAccount(
  userId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const stripe = getStripeClient();
  if (!stripe) return null;

  const { data } = await admin
    .from("stripe_accounts")
    .select("stripe_account_id")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("connected_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const accountId = (data as { stripe_account_id?: string } | null)
    ?.stripe_account_id;
  if (!accountId) return null;

  const account = await stripe.accounts.retrieve(accountId);
  if (
    ("deleted" in account && account.deleted) ||
    !account.charges_enabled ||
    !account.payouts_enabled
  ) {
    return null;
  }
  return account.id;
}

export async function listFailedVibePayouts(): Promise<FailedVibePayoutRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("night_package_order_stops")
    .select(
      `
      id,
      order_id,
      venue_id,
      title,
      venue_payout_cents,
      payout_status,
      created_at,
      venue:venues(name)
    `,
    )
    .eq("payout_status", "failed")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;

  return (data ?? []).map((row) => {
    const venue = row.venue as { name?: string } | { name?: string }[] | null;
    const venueName = Array.isArray(venue)
      ? venue[0]?.name ?? null
      : venue?.name ?? null;

    return {
      id: row.id as string,
      order_id: row.order_id as string,
      venue_id: row.venue_id as string,
      title: (row.title as string | null) ?? null,
      venue_payout_cents: Number(row.venue_payout_cents ?? 0),
      payout_status: row.payout_status as string,
      created_at: row.created_at as string,
      venue_name: venueName,
    };
  });
}

async function transferFailedStopsForOrder(orderId: string): Promise<number> {
  const admin = createAdminClient();
  const stripe = getStripeClient();
  if (!stripe) {
    throw new Error("STRIPE_SECRET_KEY is not configured for admin.");
  }

  await admin
    .from("night_package_order_stops")
    .update({ payout_status: "pending", stripe_transfer_id: null })
    .eq("order_id", orderId)
    .eq("payout_status", "failed");

  const { data: stops, error } = await admin
    .from("night_package_order_stops")
    .select(
      "id, venue_id, venue_payout_cents, stripe_transfer_id, payout_status",
    )
    .eq("order_id", orderId)
    .order("sort_order");
  if (error) throw error;

  const venueIds = [...new Set((stops ?? []).map((s) => s.venue_id as string))];
  const { data: venues } = await admin
    .from("venues")
    .select("id, owner_id")
    .in("id", venueIds);
  const ownerByVenue = new Map(
    (venues ?? []).map((v) => [v.id as string, v.owner_id as string | null]),
  );

  let transferred = 0;
  for (const stop of stops ?? []) {
    if (stop.stripe_transfer_id || stop.payout_status === "transferred") {
      continue;
    }
    const amount = Number(stop.venue_payout_cents ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      await admin
        .from("night_package_order_stops")
        .update({ payout_status: "skipped" })
        .eq("id", stop.id);
      continue;
    }
    const ownerId = ownerByVenue.get(stop.venue_id as string);
    if (!ownerId) {
      await admin
        .from("night_package_order_stops")
        .update({ payout_status: "failed" })
        .eq("id", stop.id);
      continue;
    }
    const destination = await getActiveConnectedStripeAccount(ownerId);
    if (!destination) {
      await admin
        .from("night_package_order_stops")
        .update({ payout_status: "failed" })
        .eq("id", stop.id);
      continue;
    }
    try {
      const transfer = await stripe.transfers.create({
        amount,
        currency: "usd",
        destination,
        transfer_group: orderId,
        metadata: {
          order_id: orderId,
          order_stop_id: stop.id as string,
          venue_id: stop.venue_id as string,
          type: "night_package_venue_payout",
        },
      });
      await admin
        .from("night_package_order_stops")
        .update({
          stripe_transfer_id: transfer.id,
          payout_status: "transferred",
        })
        .eq("id", stop.id);
      transferred += 1;
    } catch (err) {
      console.error("[admin-vibe-payout] transfer failed", stop.id, err);
      await admin
        .from("night_package_order_stops")
        .update({ payout_status: "failed" })
        .eq("id", stop.id);
    }
  }
  return transferred;
}

export async function retryFailedVibePayouts(params: {
  orderId?: string;
  stopId?: string;
}): Promise<{ transferred: number; orderIds: string[] }> {
  const admin = createAdminClient();
  let orderIds: string[] = [];

  if (params.orderId) {
    orderIds = [params.orderId];
  } else if (params.stopId) {
    const { data } = await admin
      .from("night_package_order_stops")
      .select("order_id")
      .eq("id", params.stopId)
      .maybeSingle();
    if (data?.order_id) orderIds = [data.order_id as string];
  } else {
    const failed = await listFailedVibePayouts();
    orderIds = [...new Set(failed.map((f) => f.order_id))];
  }

  let transferred = 0;
  for (const orderId of orderIds) {
    transferred += await transferFailedStopsForOrder(orderId);
  }
  return { transferred, orderIds };
}
