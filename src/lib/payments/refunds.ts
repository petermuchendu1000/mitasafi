// =============================================================================
// MITASAFI: REFUND CALCULATION (SC-5)
// =============================================================================
// Calculates refund amounts based on dispute type, booking price, and
// completion percentage.
//
// Refund model:
//   - Full refund: 100% of agreed_price
//   - Partial refund: Based on completion percentage + dispute type adjustments
//   - Minimum refund: Capped by platform policy
//   - Currency: KES only (matches payment system)
//
// This module is pure computation — no side effects. The actual refund
// processing (M-Pesa B2C, wallet debit, etc.) is handled separately.
// =============================================================================

import type { DisputeType } from "@/types/bookings";

// =============================================================================
// TYPES
// =============================================================================

export interface RefundCalculationInput {
  /** Agreed booking price in KES. */
  agreedPrice: number;
  /** Dispute type — affects refund percentage for partial refunds. */
  disputeType: DisputeType;
  /** How much of the job was completed (0-100). Null = unknown. */
  completionPercentage: number | null;
  /** Whether the customer explicitly requested a full refund. */
  requestedFullRefund: boolean;
}

export interface RefundBreakdown {
  /** Original agreed price. */
  agreedPrice: number;
  /** Calculated refund amount. */
  refundAmount: number;
  /** Refund as percentage of agreed price. */
  refundPercentage: number;
  /** Human-readable explanation of the calculation. */
  explanation: string;
  /** Whether this is a full or partial refund. */
  isFullRefund: boolean;
  /** Currency code. */
  currency: string;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Base refund percentages by dispute type.
 * These apply when the job was partially completed (adjusted by completion %).
 * Full refund requests bypass these for qualifying dispute types.
 */
const DISPUTE_TYPE_REFUND_RATES: Record<DisputeType, number> = {
  safety: 1.0, // 100% — safety is non-negotiable
  damage: 1.0, // 100% — provider liable for damage
  no_show: 1.0, // 100% — no service was delivered
  quality: 0.5, // 50% base — adjusted by completion
  pricing: 0.3, // 30% base — typically smaller adjustments
  cancellation: 0.8, // 80% — most of the fee should be returned
};

/**
 * Dispute types that always qualify for full refund regardless of completion.
 */
const FULL_REFUND_ELIGIBLE: ReadonlySet<DisputeType> = new Set([
  "safety",
  "damage",
  "no_show",
]);

/** Minimum refund amount in KES. Disputes below this aren't worth processing. */
const MINIMUM_REFUND_KES = 50;

// =============================================================================
// CALCULATION
// =============================================================================

/**
 * Calculate the refund amount for a disputed booking.
 *
 * Rules:
 *   1. If agreed_price <= 0, no refund.
 *   2. If dispute type qualifies for automatic full refund → 100%.
 *   3. If customer requested full refund AND completion <= 25% → 100%.
 *   4. Otherwise: partial refund based on (1 - completion%) × base rate.
 *   5. Apply minimum refund floor.
 *   6. Refund cannot exceed agreed price.
 *
 * @example
 * calculateRefund({
 *   agreedPrice: 5000,
 *   disputeType: "quality",
 *   completionPercentage: 60,
 *   requestedFullRefund: false,
 * });
 * // → { refundAmount: 1000, refundPercentage: 20, ... }
 */
export function calculateRefund(input: RefundCalculationInput): RefundBreakdown {
  const { agreedPrice, disputeType, completionPercentage, requestedFullRefund } =
    input;

  // Guard: no refund if no price
  if (agreedPrice <= 0) {
    return {
      agreedPrice: 0,
      refundAmount: 0,
      refundPercentage: 0,
      explanation: "No refund applicable — no agreed price on this booking.",
      isFullRefund: false,
      currency: "KES",
    };
  }

  // Rule 1: Safety, damage, no-show → always full refund
  if (FULL_REFUND_ELIGIBLE.has(disputeType)) {
    return buildResult(
      agreedPrice,
      agreedPrice,
      `Full refund for ${disputeType} dispute — provider fully liable.`
    );
  }

  // Rule 2: Full refund request + minimal completion
  const completion = completionPercentage ?? 0;
  if (requestedFullRefund && completion <= 25) {
    return buildResult(
      agreedPrice,
      agreedPrice,
      `Full refund granted — job was ≤25% complete (${completion}%).`
    );
  }

  // Rule 3: Partial refund based on completion + type rate
  const baseRate = DISPUTE_TYPE_REFUND_RATES[disputeType] ?? 0.5;
  const uncompletedFraction = 1 - completion / 100;
  const rawRefundRate = baseRate * uncompletedFraction;

  // Ensure at least 10% refund for any valid dispute
  const effectiveRate = Math.max(rawRefundRate, 0.1);
  let refundAmount = Math.round(agreedPrice * effectiveRate * 100) / 100;

  // Apply minimum
  if (refundAmount < MINIMUM_REFUND_KES && agreedPrice >= MINIMUM_REFUND_KES) {
    refundAmount = MINIMUM_REFUND_KES;
  }

  // Cap at agreed price
  refundAmount = Math.min(refundAmount, agreedPrice);

  // Round to whole KES (standard for M-Pesa)
  refundAmount = Math.round(refundAmount);

  const percent = Math.round((refundAmount / agreedPrice) * 100);
  const explanation =
    `Partial refund: ${percent}% of KES ${agreedPrice.toLocaleString()}. ` +
    `Based on ${disputeType} dispute (${(baseRate * 100).toFixed(0)}% base rate) ` +
    `with ${completion}% job completion.`;

  return buildResult(agreedPrice, refundAmount, explanation);
}

// =============================================================================
// HELPER
// =============================================================================

function buildResult(
  agreedPrice: number,
  refundAmount: number,
  explanation: string
): RefundBreakdown {
  const roundedRefund = Math.round(refundAmount);
  return {
    agreedPrice,
    refundAmount: roundedRefund,
    refundPercentage:
      agreedPrice > 0 ? Math.round((roundedRefund / agreedPrice) * 100) : 0,
    explanation,
    isFullRefund: roundedRefund >= agreedPrice,
    currency: "KES",
  };
}
