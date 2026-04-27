-- =============================================================================
-- ANALYTICS: Event Tracking + Search Query Logging
-- =============================================================================
-- Lightweight analytics tables for tracking user interactions on the
-- services marketplace. Designed for key funnel metrics:
--   page_view → search → filter → card_click → detail_view → booking_request
--
-- RLS: Only authenticated users can insert. Reads restricted to service role.
-- =============================================================================

-- ─── analytics_events ───────────────────────────────────────────────────────
-- Generic event table for all tracked interactions.
-- Indexed on (event_name, created_at) for time-range queries.
-- =============================================================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name    text NOT NULL,            -- e.g. 'page_view', 'search', 'card_click'
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id    text,                     -- client-generated session ID
  properties    jsonb DEFAULT '{}',       -- event-specific payload
  page_path     text,                     -- URL path where event fired
  referrer      text,                     -- document.referrer
  user_agent    text,                     -- navigator.userAgent (truncated)
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_analytics_events_name_created
  ON analytics_events (event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user
  ON analytics_events (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_events_session
  ON analytics_events (session_id, created_at DESC)
  WHERE session_id IS NOT NULL;

-- GIN index on properties for JSON queries (e.g. by category, provider_id)
CREATE INDEX IF NOT EXISTS idx_analytics_events_properties
  ON analytics_events USING gin (properties);

-- ─── search_queries ─────────────────────────────────────────────────────────
-- Dedicated table for search analytics. Tracks what users search for,
-- how many results they get, and which provider they click on.
-- =============================================================================
CREATE TABLE IF NOT EXISTS search_queries (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query               text NOT NULL,
  user_id             uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  results_count       integer NOT NULL DEFAULT 0,
  category_context    text,                -- category slug if filtered
  clicked_provider_id uuid REFERENCES service_providers(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_queries_query_created
  ON search_queries (query, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_queries_zero_results
  ON search_queries (created_at DESC)
  WHERE results_count = 0;

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can insert events — for pre-login tracking
CREATE POLICY analytics_events_insert ON analytics_events
  FOR INSERT TO authenticated, anon
  WITH CHECK (true);

-- Only service role can read (for admin dashboards / data exports)
CREATE POLICY analytics_events_select ON analytics_events
  FOR SELECT TO service_role
  USING (true);

CREATE POLICY search_queries_insert ON search_queries
  FOR INSERT TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY search_queries_select ON search_queries
  FOR SELECT TO service_role
  USING (true);

-- ─── TTL (optional) ────────────────────────────────────────────────────────
-- In production, add a pg_cron job to purge events older than 90 days:
-- SELECT cron.schedule('purge-old-analytics', '0 3 * * *',
--   $$DELETE FROM analytics_events WHERE created_at < now() - interval '90 days'$$
-- );
