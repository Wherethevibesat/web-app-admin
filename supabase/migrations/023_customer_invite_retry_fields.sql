ALTER TABLE public.customer_import_contacts
  ADD COLUMN IF NOT EXISTS invite_attempt_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_invite_attempt_at TIMESTAMPTZ;
