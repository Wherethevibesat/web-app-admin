CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_transactions_intent_type_unique
  ON public.platform_transactions(stripe_payment_intent_id, type)
  WHERE stripe_payment_intent_id IS NOT NULL;
