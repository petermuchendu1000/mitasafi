-- =============================================================================
-- M6: PAYMENT INTEGRATION — DATABASE TABLES
-- =============================================================================
-- Creates:
--   1. booking_payments   — individual payment transactions (M-Pesa, card, cash)
--   2. provider_payouts   — payout disbursements to providers
--   3. wallet columns     — wallet_balance + total_earnings on service_providers
--   4. Indexes            — for common query patterns
--   5. RLS policies       — row-level security for booking_payments and payouts
--
-- Payment flow:
--   customer_confirmed → payment_pending → (STK Push) → booking_payments row created
--   → callback confirms → booking_payments.status = completed → booking.payment_status = paid
--   → provider wallet_balance += net amount → provider can request payout
--
-- Depends on:
--   - 20260108120002_trust_provider_layer.sql (service_providers)
--   - 20260108120003_booking_core.sql (bookings)
--   - auth.users
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PAYMENT STATUS ENUM
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_transaction_status') THEN
    CREATE TYPE payment_transaction_status AS ENUM (
      'pending',      -- STK push initiated, waiting for callback
      'processing',   -- callback received, validating
      'completed',    -- payment confirmed
      'failed',       -- payment failed (timeout, insufficient funds, etc.)
      'cancelled',    -- payment cancelled by user
      'refunded'      -- full refund processed
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payout_status') THEN
    CREATE TYPE payout_status AS ENUM (
      'pending',      -- payout requested by provider
      'processing',   -- being processed (M-Pesa B2C or bank transfer initiated)
      'completed',    -- disbursement confirmed
      'failed',       -- disbursement failed
      'cancelled'     -- cancelled by admin or provider
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_type') THEN
    CREATE TYPE payment_method_type AS ENUM (
      'mpesa',        -- M-Pesa STK Push (C2B)
      'card',         -- Card payment (future)
      'cash',         -- Cash on delivery (manual confirmation)
      'bank_transfer' -- Bank transfer (future)
    );
  END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. BOOKING PAYMENTS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
-- Each row represents a single payment attempt for a booking.
-- A booking may have multiple payment rows (failed attempts + final success).
-- Named 'booking_payments' to distinguish from property management 'payments' table.

CREATE TABLE IF NOT EXISTS booking_payments (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id                UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  payer_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  provider_id               UUID NOT NULL REFERENCES service_providers(id) ON DELETE RESTRICT,

  -- Amount
  amount                    DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  currency                  TEXT NOT NULL DEFAULT 'KES',
  platform_fee              DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  provider_amount           DECIMAL(12,2) NOT NULL CHECK (provider_amount >= 0),

  -- Method
  payment_method            payment_method_type NOT NULL DEFAULT 'mpesa',

  -- M-Pesa specific fields
  mpesa_checkout_request_id TEXT,           -- STK Push CheckoutRequestID
  mpesa_merchant_request_id TEXT,           -- STK Push MerchantRequestID
  mpesa_receipt_number      TEXT,           -- M-Pesa confirmation code (e.g., "QKJ3A7B2C1")
  mpesa_phone               TEXT,           -- Phone number used for payment
  mpesa_result_code         INTEGER,        -- Daraja result code
  mpesa_result_desc         TEXT,           -- Daraja result description

  -- Status
  status                    payment_transaction_status NOT NULL DEFAULT 'pending',
  failure_reason            TEXT,           -- Human-readable failure reason

  -- Metadata
  metadata                  JSONB DEFAULT '{}',
  idempotency_key           TEXT UNIQUE,    -- Prevents duplicate payments

  -- Timestamps
  initiated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at              TIMESTAMPTZ,    -- When payment was confirmed
  failed_at                 TIMESTAMPTZ,    -- When payment failed
  refunded_at               TIMESTAMPTZ,    -- When refund was processed
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. PROVIDER PAYOUTS TABLE
-- ─────────────────────────────────────────────────────────────────────────────
-- Tracks disbursements from platform to provider.
-- Initially manual (admin-triggered), later automated via M-Pesa B2C.

CREATE TABLE IF NOT EXISTS provider_payouts (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id               UUID NOT NULL REFERENCES service_providers(id) ON DELETE RESTRICT,
  
  -- Amount
  amount                    DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  currency                  TEXT NOT NULL DEFAULT 'KES',

  -- Payout method
  payout_method             payment_method_type NOT NULL DEFAULT 'mpesa',
  mpesa_phone               TEXT,           -- Provider's M-Pesa number
  bank_name                 TEXT,           -- For bank transfers (future)
  bank_account              TEXT,           -- For bank transfers (future)

  -- M-Pesa B2C specific
  mpesa_conversation_id     TEXT,           -- B2C ConversationID
  mpesa_originator_id       TEXT,           -- B2C OriginatorConversationID
  mpesa_receipt_number      TEXT,           -- B2C TransactionReceipt

  -- Status
  status                    payout_status NOT NULL DEFAULT 'pending',
  failure_reason            TEXT,
  reference                 TEXT,           -- Internal reference number

  -- Admin tracking
  requested_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by               UUID REFERENCES auth.users(id),
  approved_at               TIMESTAMPTZ,
  processed_at              TIMESTAMPTZ,    -- When disbursement was completed

  -- Timestamps
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. WALLET COLUMNS ON service_providers
-- ─────────────────────────────────────────────────────────────────────────────
-- Track running balance and lifetime earnings.
-- wallet_balance increases when a payment is confirmed, decreases on payout.
-- total_earnings is a monotonically increasing lifetime sum.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'service_providers' AND column_name = 'wallet_balance'
  ) THEN
    ALTER TABLE service_providers
      ADD COLUMN wallet_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN total_earnings DECIMAL(12,2) NOT NULL DEFAULT 0;
  END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

-- Booking payments: lookup by booking, by payer, by status, by M-Pesa reference
CREATE INDEX IF NOT EXISTS idx_booking_payments_booking_id ON booking_payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_payments_payer_id ON booking_payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_booking_payments_provider_id ON booking_payments(provider_id);
CREATE INDEX IF NOT EXISTS idx_booking_payments_status ON booking_payments(status);
CREATE INDEX IF NOT EXISTS idx_booking_payments_mpesa_checkout ON booking_payments(mpesa_checkout_request_id) WHERE mpesa_checkout_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_booking_payments_mpesa_receipt ON booking_payments(mpesa_receipt_number) WHERE mpesa_receipt_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_booking_payments_created_at ON booking_payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_payments_provider_status ON booking_payments(provider_id, status);

-- Payouts: lookup by provider, by status
CREATE INDEX IF NOT EXISTS idx_provider_payouts_provider_id ON provider_payouts(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_payouts_status ON provider_payouts(status);
CREATE INDEX IF NOT EXISTS idx_provider_payouts_created_at ON provider_payouts(created_at DESC);

-- Wallet: provider earnings queries
CREATE INDEX IF NOT EXISTS idx_service_providers_wallet ON service_providers(wallet_balance) WHERE wallet_balance > 0;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. AUTO-UPDATE updated_at TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_booking_payments_updated_at ON booking_payments;
CREATE TRIGGER set_booking_payments_updated_at
  BEFORE UPDATE ON booking_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_provider_payouts_updated_at ON provider_payouts;
CREATE TRIGGER set_provider_payouts_updated_at
  BEFORE UPDATE ON provider_payouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. ROW-LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE booking_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_payouts ENABLE ROW LEVEL SECURITY;

-- Booking payments: payers can see their own payments
CREATE POLICY booking_payments_payer_select ON booking_payments
  FOR SELECT USING (auth.uid() = payer_id);

-- Booking payments: providers can see payments for their bookings
CREATE POLICY booking_payments_provider_select ON booking_payments
  FOR SELECT USING (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    )
  );

-- Booking payments: only service role can insert/update (server-side actions)
CREATE POLICY booking_payments_service_insert ON booking_payments
  FOR INSERT WITH CHECK (true);
  -- Enforced by service_role key in server actions

CREATE POLICY booking_payments_service_update ON booking_payments
  FOR UPDATE USING (true);
  -- Enforced by service_role key in server actions

-- Payouts: providers can see their own payouts
CREATE POLICY payouts_provider_select ON provider_payouts
  FOR SELECT USING (
    provider_id IN (
      SELECT id FROM service_providers WHERE user_id = auth.uid()
    )
  );

-- Payouts: only service role can insert/update
CREATE POLICY payouts_service_insert ON provider_payouts
  FOR INSERT WITH CHECK (true);

CREATE POLICY payouts_service_update ON provider_payouts
  FOR UPDATE USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. HELPER FUNCTION: Credit provider wallet after payment confirmation
-- ─────────────────────────────────────────────────────────────────────────────
-- Called by the application layer, not a trigger, to maintain explicit control.

CREATE OR REPLACE FUNCTION credit_provider_wallet(
  p_provider_id UUID,
  p_amount DECIMAL(12,2)
)
RETURNS VOID AS $$
BEGIN
  UPDATE service_providers
  SET
    wallet_balance = wallet_balance + p_amount,
    total_earnings = total_earnings + p_amount
  WHERE id = p_provider_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Provider % not found', p_provider_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. HELPER FUNCTION: Debit provider wallet for payout
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION debit_provider_wallet(
  p_provider_id UUID,
  p_amount DECIMAL(12,2)
)
RETURNS VOID AS $$
DECLARE
  current_balance DECIMAL(12,2);
BEGIN
  SELECT wallet_balance INTO current_balance
  FROM service_providers
  WHERE id = p_provider_id
  FOR UPDATE; -- Row lock to prevent race conditions

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Provider % not found', p_provider_id;
  END IF;

  IF current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance. Available: %, Requested: %', current_balance, p_amount;
  END IF;

  UPDATE service_providers
  SET wallet_balance = wallet_balance - p_amount
  WHERE id = p_provider_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
