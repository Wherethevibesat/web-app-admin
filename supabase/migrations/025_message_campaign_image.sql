ALTER TABLE public.admin_message_campaigns
  ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.user_notifications
  ADD COLUMN IF NOT EXISTS image_url TEXT;
