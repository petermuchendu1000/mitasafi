-- Social link click tracking
-- Stores every click on a provider's social media link for analytics.
-- Used by: /api/social-click (POST beacon + GET redirect)
-- Consumed by: provider dashboard "Social Traffic" card

CREATE TABLE IF NOT EXISTS social_link_clicks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id   uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  platform      text NOT NULL,           -- e.g. 'instagram', 'facebook', 'website'
  destination_url text NOT NULL,         -- full URL the user was sent to
  referrer      text,                    -- HTTP Referer header (page the click came from)
  user_agent    text,                    -- browser user-agent for device analytics
  country       text,                    -- optional, derived server-side
  session_id    text,                    -- client-generated ID to deduplicate beacon+redirect
  clicked_at    timestamptz NOT NULL DEFAULT now()
);

-- Index for provider dashboard queries (clicks per provider, grouped by platform/date)
CREATE INDEX idx_social_clicks_provider_date
  ON social_link_clicks (provider_id, clicked_at DESC);

-- Index for platform breakdown queries
CREATE INDEX idx_social_clicks_provider_platform
  ON social_link_clicks (provider_id, platform, clicked_at DESC);

-- Index for deduplication by session_id
CREATE INDEX idx_social_clicks_session
  ON social_link_clicks (session_id)
  WHERE session_id IS NOT NULL;

-- Enable RLS
ALTER TABLE social_link_clicks ENABLE ROW LEVEL SECURITY;

-- Providers can read their own click data
CREATE POLICY "Providers can view own clicks"
  ON social_link_clicks
  FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    )
  );

-- Inserts go through the API route using the service-role key (admin client),
-- so no INSERT policy is needed for authenticated users.
-- The API route validates inputs and writes with the admin client.

COMMENT ON TABLE social_link_clicks IS 'Tracks clicks on provider social media links from their public profile page';
COMMENT ON COLUMN social_link_clicks.session_id IS 'Client-generated UUID to deduplicate beacon + redirect double-tracking';
COMMENT ON COLUMN social_link_clicks.platform IS 'Social platform key matching SOCIAL_PLATFORMS: website, facebook, instagram, tiktok, twitter, linkedin, youtube';
