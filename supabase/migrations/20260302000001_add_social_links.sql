-- Add social_links jsonb column to service_providers
-- Stores provider social media handles as { platform: url } pairs
-- e.g. { "facebook": "https://facebook.com/acme", "tiktok": "@acme", ... }

ALTER TABLE service_providers
  ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN service_providers.social_links IS 'Provider social media handles. Keys: facebook, instagram, twitter, tiktok, linkedin, youtube, website';
