import Stripe from "stripe";

export function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export async function createPlatformPayout(amountDollars: number): Promise<string> {
  const stripe = getStripeClient();
  if (!stripe) {
    throw new Error("STRIPE_SECRET_KEY is not configured for admin payouts.");
  }

  const amountCents = Math.round(amountDollars * 100);
  if (amountCents < 100) {
    throw new Error("Minimum payout is $1.00.");
  }

  const balance = await stripe.balance.retrieve();
  const availableUsd =
    balance.available.find((entry) => entry.currency === "usd")?.amount ?? 0;
  if (amountCents > availableUsd) {
    throw new Error(
      `Insufficient Stripe balance. Available: $${(availableUsd / 100).toFixed(2)}.`,
    );
  }

  const payout = await stripe.payouts.create({
    amount: amountCents,
    currency: "usd",
  });

  return payout.id;
}
