-- Migration: Support Tables (Reviews, Notifications, System)
-- Description: Reviews, ratings, notifications, and system tables
-- Dependencies: 20260108120004_booking_flow_details.sql
-- Idempotent: Yes

-- Drop old notifications table if exists (different schema)
DROP TABLE IF EXISTS public.notifications CASCADE;

-- =============================================================================
-- TABLE: reviews
-- Purpose: Customer reviews of provider services
-- =============================================================================

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  
  -- Participants
  reviewer_id uuid NOT NULL,  -- Customer who left review
  provider_id uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  
  -- Rating (using enum for validation)
  rating review_rating NOT NULL,
  
  -- Review content
  title text,
  review_text text,
  
  -- Dimension ratings (optional granular ratings)
  quality_rating review_rating,
  communication_rating review_rating,
  timeliness_rating review_rating,
  professionalism_rating review_rating,
  value_rating review_rating,
  
  -- Media
  review_photos jsonb,  -- Array of photo URLs
  
  -- Provider response
  provider_response text,
  provider_responded_at timestamptz,
  
  -- Moderation
  is_verified_booking boolean DEFAULT true,  -- Review from actual booking
  is_flagged boolean DEFAULT false,
  flag_reason text,
  is_hidden boolean DEFAULT false,  -- Hidden by admin
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT review_one_per_booking UNIQUE(booking_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_provider_id ON reviews(provider_id) WHERE is_hidden = false;
CREATE INDEX IF NOT EXISTS idx_reviews_service_id ON reviews(service_id) WHERE is_hidden = false;
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating) WHERE is_hidden = false;
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC) WHERE is_hidden = false;
CREATE INDEX IF NOT EXISTS idx_reviews_flagged ON reviews(is_flagged) WHERE is_flagged = true;

COMMENT ON TABLE reviews IS 'Customer reviews of completed bookings';
COMMENT ON COLUMN reviews.is_verified_booking IS 'True = review from actual completed booking (not fake)';
COMMENT ON COLUMN reviews.is_flagged IS 'True if flagged for inappropriate content';

DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: review_helpful_votes
-- Purpose: "Was this review helpful?" voting
-- =============================================================================

CREATE TABLE IF NOT EXISTS review_helpful_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  
  is_helpful boolean NOT NULL,  -- true = helpful, false = not helpful
  
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT one_vote_per_user_per_review UNIQUE(review_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_review_votes_review_id ON review_helpful_votes(review_id);

COMMENT ON TABLE review_helpful_votes IS 'User votes on review helpfulness';

-- =============================================================================
-- TABLE: notifications
-- Purpose: User notifications (in-app, email, SMS)
-- =============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Recipient
  user_id uuid NOT NULL,
  user_role text NOT NULL,  -- 'customer', 'provider', 'admin'
  
  -- Notification content
  type text NOT NULL,  -- 'booking_new', 'booking_accepted', 'message_new', 'review_new', etc.
  title text NOT NULL,
  message text NOT NULL,
  
  -- Related entities
  booking_id uuid,
  provider_id uuid,
  review_id uuid,
  
  -- Deep link
  action_url text,  -- Where to go when clicked
  
  -- Delivery channels
  in_app boolean DEFAULT true,
  email boolean DEFAULT false,
  sms boolean DEFAULT false,
  
  -- Status
  is_read boolean DEFAULT false,
  read_at timestamptz,
  
  -- Delivery status
  email_sent boolean DEFAULT false,
  email_sent_at timestamptz,
  sms_sent boolean DEFAULT false,
  sms_sent_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT notification_has_entity CHECK (
    booking_id IS NOT NULL OR 
    provider_id IS NOT NULL OR 
    review_id IS NOT NULL OR
    type IN ('system_announcement', 'account_update')
  )
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_booking_id ON notifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

COMMENT ON TABLE notifications IS 'Multi-channel notifications (in-app, email, SMS)';
COMMENT ON COLUMN notifications.action_url IS 'Deep link to relevant page (e.g., /bookings/123)';

-- =============================================================================
-- TABLE: user_preferences
-- Purpose: User notification and app preferences
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id uuid PRIMARY KEY,
  
  -- Notification preferences
  notify_booking_updates boolean DEFAULT true,
  notify_messages boolean DEFAULT true,
  notify_reviews boolean DEFAULT true,
  notify_promotions boolean DEFAULT false,
  
  -- Channel preferences
  email_notifications boolean DEFAULT true,
  sms_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  
  -- Language
  preferred_language text DEFAULT 'en',  -- 'en', 'sw' (Swahili)
  
  -- Privacy
  show_profile_publicly boolean DEFAULT true,
  allow_reviews_publicly boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE user_preferences IS 'User app and notification preferences';

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: saved_providers
-- Purpose: Customer's favorite/saved providers
-- =============================================================================

CREATE TABLE IF NOT EXISTS saved_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  provider_id uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  
  notes text,  -- Why saved? "Great plumber", "Reliable cleaner"
  
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT saved_provider_unique UNIQUE(customer_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_providers_customer_id ON saved_providers(customer_id);
CREATE INDEX IF NOT EXISTS idx_saved_providers_provider_id ON saved_providers(provider_id);

COMMENT ON TABLE saved_providers IS 'Customers can save favorite providers for quick rebooking';

-- =============================================================================
-- TABLE: blocked_users
-- Purpose: Users blocking other users (providers blocking customers, vice versa)
-- =============================================================================

CREATE TABLE IF NOT EXISTS blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  
  reason text,
  
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT cannot_block_self CHECK (blocker_id != blocked_id),
  CONSTRAINT block_unique UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker_id ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_id ON blocked_users(blocked_id);

COMMENT ON TABLE blocked_users IS 'User blocking (prevents bookings between blocked users)';

-- =============================================================================
-- TABLE: provider_portfolio
-- Purpose: Provider work samples and portfolio photos
-- =============================================================================

CREATE TABLE IF NOT EXISTS provider_portfolio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  
  title text NOT NULL,
  description text,
  
  photos jsonb NOT NULL,  -- Array of photo URLs (min 1)
  
  project_date date,
  location text,
  
  is_featured boolean DEFAULT false,
  display_order int,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_portfolio_provider_id ON provider_portfolio(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_portfolio_service_id ON provider_portfolio(service_id);
CREATE INDEX IF NOT EXISTS idx_provider_portfolio_featured ON provider_portfolio(provider_id, is_featured) WHERE is_featured = true;

COMMENT ON TABLE provider_portfolio IS 'Provider work samples and before/after photos';

DROP TRIGGER IF EXISTS update_provider_portfolio_updated_at ON provider_portfolio;
CREATE TRIGGER update_provider_portfolio_updated_at
  BEFORE UPDATE ON provider_portfolio
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: system_announcements
-- Purpose: Platform-wide announcements
-- =============================================================================

CREATE TABLE IF NOT EXISTS system_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  title text NOT NULL,
  message text NOT NULL,
  
  -- Targeting
  target_audience text NOT NULL,  -- 'all', 'customers', 'providers', 'specific_users'
  target_user_ids jsonb,  -- Array of user IDs if target_audience = 'specific_users'
  
  -- Display
  announcement_type text DEFAULT 'info',  -- 'info', 'warning', 'success', 'error'
  is_dismissible boolean DEFAULT true,
  
  -- Scheduling
  starts_at timestamptz DEFAULT now(),
  ends_at timestamptz,
  
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_active ON system_announcements(is_active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_announcements_target_audience ON system_announcements(target_audience);

COMMENT ON TABLE system_announcements IS 'Platform-wide announcements and alerts';

DROP TRIGGER IF EXISTS update_system_announcements_updated_at ON system_announcements;
CREATE TRIGGER update_system_announcements_updated_at
  BEFORE UPDATE ON system_announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: feature_flags
-- Purpose: Feature toggles for gradual rollout
-- =============================================================================

CREATE TABLE IF NOT EXISTS feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  flag_key text UNIQUE NOT NULL,
  flag_name text NOT NULL,
  description text,
  
  is_enabled boolean DEFAULT false,
  
  -- Rollout percentage (0-100)
  rollout_percentage int DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
  
  -- Targeting
  enabled_for_user_ids jsonb,  -- Array of specific user IDs
  enabled_for_provider_ids jsonb,  -- Array of specific provider IDs
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_flag_key ON feature_flags(flag_key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_is_enabled ON feature_flags(is_enabled) WHERE is_enabled = true;

COMMENT ON TABLE feature_flags IS 'Feature toggles for gradual rollout and A/B testing';
COMMENT ON COLUMN feature_flags.rollout_percentage IS 'Percentage of users who see feature (0-100)';

DROP TRIGGER IF EXISTS update_feature_flags_updated_at ON feature_flags;
CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: audit_log
-- Purpose: Security and compliance audit trail
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who
  user_id uuid,
  user_role text,  -- 'customer', 'provider', 'admin', 'system'
  
  -- What
  action text NOT NULL,  -- 'booking_created', 'provider_verified', 'dispute_resolved', etc.
  entity_type text NOT NULL,  -- 'booking', 'provider', 'review', etc.
  entity_id uuid NOT NULL,
  
  -- Details
  details jsonb,  -- Free-form JSON with action-specific data
  
  -- When/Where
  ip_address inet,
  user_agent text,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

COMMENT ON TABLE audit_log IS 'Complete audit trail for security and compliance';
COMMENT ON COLUMN audit_log.details IS 'JSON object with action-specific context';

-- =============================================================================
-- TABLE: api_keys
-- Purpose: API access for integrations (future)
-- =============================================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  provider_id uuid REFERENCES service_providers(id) ON DELETE CASCADE,
  
  key_name text NOT NULL,
  key_hash text NOT NULL UNIQUE,  -- Hashed API key (never store plaintext)
  
  permissions jsonb NOT NULL,  -- Array of allowed endpoints/actions
  
  is_active boolean DEFAULT true,
  
  last_used_at timestamptz,
  usage_count int DEFAULT 0,
  
  expires_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_provider_id ON api_keys(provider_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON api_keys(expires_at) WHERE is_active = true;

COMMENT ON TABLE api_keys IS 'API keys for provider integrations (future feature)';
COMMENT ON COLUMN api_keys.key_hash IS 'Bcrypt hash of API key (never store plaintext)';

DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: system_metrics (for monitoring/dashboard)
-- Purpose: System health and usage metrics
-- =============================================================================

CREATE TABLE IF NOT EXISTS system_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  metric_name text NOT NULL,
  metric_value decimal(15,2) NOT NULL,
  metric_unit text,  -- 'count', 'seconds', 'percentage', 'currency'
  
  dimensions jsonb,  -- Grouping dimensions (category, service, region, etc.)
  
  recorded_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_metrics_metric_name ON system_metrics(metric_name, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded_at ON system_metrics(recorded_at DESC);

COMMENT ON TABLE system_metrics IS 'Time-series metrics for monitoring and analytics';
COMMENT ON COLUMN system_metrics.dimensions IS 'JSON object with grouping dimensions';

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
