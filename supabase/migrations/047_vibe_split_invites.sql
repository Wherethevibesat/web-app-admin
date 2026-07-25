-- Split invites: guest emails + per-share invite tokens for email links.

ALTER TABLE public.vibe_payment_shares
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS share_invite_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS vibe_payment_shares_share_token_uidx
  ON public.vibe_payment_shares (share_invite_token)
  WHERE share_invite_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS vibe_payment_shares_email_idx
  ON public.vibe_payment_shares (lower(email))
  WHERE email IS NOT NULL;

ALTER TABLE public.vibe_payment_groups
  ADD COLUMN IF NOT EXISTS expires_in_minutes INTEGER;
