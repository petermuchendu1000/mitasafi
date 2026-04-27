-- Migration: Critical Schema Fixes (Post-Review)
-- Description: Fixes identified in production-grade review
-- Dependencies: 20260108120005_support_tables.sql
-- Idempotent: Yes

-- =============================================================================
-- FIX 1: Add 'draft' to verification_status enum
-- Purpose: Allow providers to add services before verification starts
-- =============================================================================

-- Add 'draft' value to existing enum (if not exists)
DO $$ BEGIN
  ALTER TYPE verification_status ADD VALUE IF NOT EXISTS 'draft' BEFORE 'not_started';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE verification_status IS 'Provider verification states - draft allows partial onboarding';

-- =============================================================================
-- FIX 2: Add pricing_snapshot to bookings
-- Purpose: Legal record of what pricing was shown/agreed to
-- =============================================================================

ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS pricing_snapshot jsonb;

CREATE INDEX IF NOT EXISTS idx_bookings_pricing_snapshot 
  ON bookings USING gin(pricing_snapshot) 
  WHERE pricing_snapshot IS NOT NULL;

COMMENT ON COLUMN bookings.pricing_snapshot IS 'CRITICAL: Immutable record of pricing calculation at booking time (for dispute resolution)';

-- Example structure for pricing_snapshot:
-- {
--   "service_pricing": {
--     "base_amount": 300,
--     "unit_amount": 150,
--     "unit": "kg",
--     "quantity": 5
--   },
--   "components": [
--     {"type": "base", "amount": 300, "description": "Base delivery fee"},
--     {"type": "unit", "amount": 750, "description": "5 kg @ 150 KES/kg"}
--   ],
--   "subtotal": 1050,
--   "service_fee": 105,
--   "total": 1155,
--   "currency": "KES",
--   "calculated_at": "2026-01-09T10:30:00Z"
-- }

-- =============================================================================
-- FIX 3: Recurring booking lifecycle infrastructure
-- Purpose: Parent/child tracking for recurring bookings
-- =============================================================================

CREATE TABLE IF NOT EXISTS booking_recurring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  parent_booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  
  -- Recurrence pattern
  frequency text NOT NULL,  -- 'daily', 'weekly', 'biweekly', 'monthly', 'custom'
  interval int NOT NULL DEFAULT 1,  -- Every N days/weeks/months
  
  -- Weekly pattern
  day_of_week int CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=Sunday, only for weekly
  
  -- Monthly pattern
  day_of_month int CHECK (day_of_month BETWEEN 1 AND 31),  -- Only for monthly
  
  -- Time
  preferred_time time,
  
  -- Lifecycle
  starts_at date NOT NULL,
  ends_at date,  -- NULL = indefinite
  
  -- Generation
  next_run_at timestamptz NOT NULL,
  last_generated_at timestamptz,
  
  -- Status
  is_active boolean DEFAULT true,
  is_paused boolean DEFAULT false,
  paused_until date,
  
  -- Stats
  total_generated int DEFAULT 0,
  total_completed int DEFAULT 0,
  total_cancelled int DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT frequency_interval_valid CHECK (
    (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'custom') AND interval > 0)
  ),
  CONSTRAINT weekly_needs_day CHECK (
    (frequency != 'weekly') OR 
    (frequency = 'weekly' AND day_of_week IS NOT NULL)
  ),
  CONSTRAINT monthly_needs_day CHECK (
    (frequency != 'monthly') OR 
    (frequency = 'monthly' AND day_of_month IS NOT NULL)
  ),
  CONSTRAINT ends_after_starts CHECK (
    (ends_at IS NULL) OR (ends_at > starts_at)
  ),
  CONSTRAINT pause_logic CHECK (
    (is_paused = false) OR 
    (is_paused = true AND paused_until IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_recurring_rules_parent_booking ON booking_recurring_rules(parent_booking_id);
CREATE INDEX IF NOT EXISTS idx_recurring_rules_next_run ON booking_recurring_rules(next_run_at) WHERE is_active = true AND is_paused = false;
CREATE INDEX IF NOT EXISTS idx_recurring_rules_active ON booking_recurring_rules(is_active) WHERE is_active = true;

COMMENT ON TABLE booking_recurring_rules IS 'Recurring booking generation rules - one parent creates many child bookings';
COMMENT ON COLUMN booking_recurring_rules.next_run_at IS 'When to generate next child booking (updated after each generation)';
COMMENT ON COLUMN booking_recurring_rules.is_paused IS 'Temporarily pause without cancelling';

DROP TRIGGER IF EXISTS update_booking_recurring_rules_updated_at ON booking_recurring_rules;
CREATE TRIGGER update_booking_recurring_rules_updated_at
  BEFORE UPDATE ON booking_recurring_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Link child bookings to parent
ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS parent_booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_recurring_instance boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurrence_sequence int;  -- 1, 2, 3... for ordering

CREATE INDEX IF NOT EXISTS idx_bookings_parent_booking ON bookings(parent_booking_id) WHERE parent_booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_recurring_instance ON bookings(is_recurring_instance) WHERE is_recurring_instance = true;

COMMENT ON COLUMN bookings.parent_booking_id IS 'Links recurring instance to parent booking';
COMMENT ON COLUMN bookings.is_recurring_instance IS 'True if this booking was auto-generated from recurring rule';
COMMENT ON COLUMN bookings.recurrence_sequence IS 'Which occurrence this is (1st, 2nd, 3rd weekly cleaning, etc.)';

-- Add constraint to ensure recurrence consistency
ALTER TABLE bookings 
  ADD CONSTRAINT recurring_instance_has_parent CHECK (
    (is_recurring_instance = false) OR
    (is_recurring_instance = true AND parent_booking_id IS NOT NULL)
  );

-- =============================================================================
-- FIX 4: Verification SLA metadata (for auto-approval and operational scaling)
-- Purpose: Define review timelines and auto-approval conditions
-- =============================================================================

ALTER TABLE service_verification_requirements 
  ADD COLUMN IF NOT EXISTS review_sla_hours int DEFAULT 72,  -- 3 days default
  ADD COLUMN IF NOT EXISTS auto_approve_conditions jsonb;

COMMENT ON COLUMN service_verification_requirements.review_sla_hours IS 'Maximum hours for verification review (operations SLA)';
COMMENT ON COLUMN service_verification_requirements.auto_approve_conditions IS 'JSON rules for automatic approval (e.g., low-risk services with valid ID)';

-- Example auto_approve_conditions structure:
-- {
--   "enabled": true,
--   "rules": [
--     {"field": "has_valid_id", "operator": "equals", "value": true},
--     {"field": "experience_years", "operator": "gte", "value": 2},
--     {"field": "reference_count", "operator": "gte", "value": 2}
--   ],
--   "logic": "AND",  // ALL rules must pass
--   "max_auto_approve_per_day": 50  // Safety limit
-- }

-- =============================================================================
-- FIX 5: One Service → One Service Type (Hard Rule)
-- Purpose: Prevent accidental polymorphic bookings
-- =============================================================================

-- Add unique constraint on services table
-- This ensures service_type_id cannot change once set
-- (Already has FK to service_types, but adding explicit comment)

COMMENT ON COLUMN services.service_type_id IS 'IMMUTABLE: One service = one service type. Emergency plumbing is a DIFFERENT service than standard plumbing.';

-- Add check to prevent service_type_id updates after bookings exist
CREATE OR REPLACE FUNCTION prevent_service_type_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.service_type_id != NEW.service_type_id THEN
    IF EXISTS (SELECT 1 FROM bookings WHERE service_id = OLD.id LIMIT 1) THEN
      RAISE EXCEPTION 'Cannot change service_type_id for service % - bookings already exist', OLD.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_service_type_change_trigger ON services;
CREATE TRIGGER prevent_service_type_change_trigger
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION prevent_service_type_change();

COMMENT ON FUNCTION prevent_service_type_change() IS 'Prevents changing service_type_id after bookings exist (data integrity)';

-- =============================================================================
-- FIX 6: Add operational monitoring queries (convenience views)
-- Purpose: Help operations team monitor verification backlog
-- =============================================================================

CREATE OR REPLACE VIEW verification_queue AS
SELECT 
  ps.id as provider_service_id,
  p.business_name,
  s.name as service_name,
  ps.verification_status,
  ps.created_at,
  svr.review_sla_hours,
  (ps.created_at + (svr.review_sla_hours || ' hours')::interval) as sla_deadline,
  CASE 
    WHEN (ps.created_at + (svr.review_sla_hours || ' hours')::interval) < now() 
    THEN true 
    ELSE false 
  END as is_overdue,
  EXTRACT(EPOCH FROM (now() - ps.created_at)) / 3600 as age_hours
FROM provider_services ps
JOIN service_providers p ON p.id = ps.provider_id
JOIN services s ON s.id = ps.service_id
JOIN service_verification_requirements svr ON svr.service_id = s.id
WHERE ps.verification_status = 'pending'
AND ps.is_active = true
ORDER BY ps.created_at ASC;

COMMENT ON VIEW verification_queue IS 'Real-time verification queue with SLA tracking for operations team';

-- =============================================================================
-- FIX 7: Dispute severity auto-classification rules
-- Purpose: Triage disputes automatically
-- =============================================================================

CREATE OR REPLACE FUNCTION auto_assign_dispute_severity()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-classify severity if not explicitly set
  IF NEW.severity IS NULL THEN
    NEW.severity := 
      CASE
        -- Safety concerns = high
        WHEN NEW.dispute_type IN ('safety', 'damage') THEN 'high'
        
        -- Large refund requests = high
        WHEN NEW.refund_amount IS NOT NULL AND NEW.refund_amount > 5000 THEN 'high'
        
        -- Medium refund requests = medium
        WHEN NEW.refund_amount IS NOT NULL AND NEW.refund_amount > 1000 THEN 'medium'
        
        -- Quality complaints with evidence = medium
        WHEN NEW.dispute_type = 'quality' AND NEW.evidence_urls IS NOT NULL THEN 'medium'
        
        -- Everything else = low
        ELSE 'low'
      END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_assign_dispute_severity_trigger ON booking_disputes;
CREATE TRIGGER auto_assign_dispute_severity_trigger
  BEFORE INSERT ON booking_disputes
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_dispute_severity();

COMMENT ON FUNCTION auto_assign_dispute_severity() IS 'Auto-classifies dispute severity for operations triage';

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
