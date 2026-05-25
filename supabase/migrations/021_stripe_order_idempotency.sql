-- Prevent duplicate VIP orders for the same payment intent
-- Safe to run after 020_marketplace_commissions.sql

CREATE UNIQUE INDEX IF NOT EXISTS idx_vip_orders_payment_intent_unique
  ON public.vip_orders(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;
