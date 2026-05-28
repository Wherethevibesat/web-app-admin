CREATE TABLE IF NOT EXISTS public.customer_import_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'Customer',
  import_batch_id UUID,
  status TEXT NOT NULL DEFAULT 'pending_invite'
    CHECK (status IN ('pending_invite', 'invited', 'activated', 'failed', 'unsubscribed')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  invite_attempt_count INT NOT NULL DEFAULT 0,
  last_invite_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_import_contacts_status
  ON public.customer_import_contacts(status);

CREATE INDEX IF NOT EXISTS idx_customer_import_contacts_batch
  ON public.customer_import_contacts(import_batch_id);
