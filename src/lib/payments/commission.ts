// =============================================================================
// MITASAFI: COMMISSION CALCULATION (M6)
// =============================================================================
// Calculates platform commission for a given transaction amount.
//
// Commission model:
//   - Flat percentage of the agreed price
//   - Subject to minimum and maximum fee constraints
//   - Configurable per environment (future: per category or provider tier)
//
// Example (10% rate, KES 50 min, KES 5,000 max):
//   KES 300  → fee = KES 50 (hits minimum)
//   KES 1,000 → fee = KES 100
//   KES 80,000 → fee = KES 5,000 (hits maximum)
// =============================================================================

import type { CommissionConfig } from "@/types/payments";

// =============================================================================
// DEFAULT COMMISSION CONFIG
// =============================================================================
// This is the MVP config. In production, this could be loaded from:
//   - Database (per-provider tier or per-category)
//   - Environment variables
//   - Admin panel settings

const DEFAULT_COMMISSION: CommissionConfig = {
  /** 10% platform commission. */
  rate: 0.10,
  /** Minimum fee of KES 50 per transaction. */
  minimumFee: 50,
  /** Maximum fee of KES 5,000 per transaction. 0 = no cap. */
  maximumFee: 5000,
  /** Currency. */
  currency: "KES",
};

// =============================================================================
// CALCULATION
// =============================================================================

export interface CommissionBreakdown {
  /** Total amount the customer pays. */
  totalAmount: number;
  /** Platform's commission fee. */
  platformFee: number;
  /** Net amount the provider receives. */
  providerAmount: number;
  /** Commission rate applied (as decimal). */
  effectiveRate: number;
  /** Currency code. */
  currency: string;
}

/**
 * Calculate commission breakdown for a given total amount.
 *
 * @param totalAmount - The agreed price for the booking (what customer pays).
 * @param config - Optional custom commission config. Uses default if omitted.
 * @returns Breakdown with fee splitting.
 *
 * @example
 * calculateCommission(1000);
 * // → { totalAmount: 1000, platformFee: 100, providerAmount: 900, ... }
 */
export function calculateCommission(
  totalAmount: number,
  config: CommissionConfig = DEFAULT_COMMISSION
): CommissionBreakdown {
  if (totalAmount <= 0) {
    return {
      totalAmount: 0,
      platformFee: 0,
      providerAmount: 0,
      effectiveRate: 0,
      currency: config.currency,
    };
  }

  // Calculate raw fee
  let platformFee = Math.round(totalAmount * config.rate * 100) / 100;

  // Apply minimum
  if (config.minimumFee > 0 && platformFee < config.minimumFee) {
    platformFee = config.minimumFee;
  }

  // Apply maximum cap
  if (config.maximumFee > 0 && platformFee > config.maximumFee) {
    platformFee = config.maximumFee;
  }

  // Ensure fee doesn't exceed total
  if (platformFee > totalAmount) {
    platformFee = totalAmount;
  }

  // Round to 2 decimal places
  platformFee = Math.round(platformFee * 100) / 100;
  const providerAmount = Math.round((totalAmount - platformFee) * 100) / 100;
  const effectiveRate =
    totalAmount > 0
      ? Math.round((platformFee / totalAmount) * 10000) / 10000
      : 0;

  return {
    totalAmount,
    platformFee,
    providerAmount,
    effectiveRate,
    currency: config.currency,
  };
}

/**
 * Get the current commission configuration.
 * In MVP, returns the static default.
 * Future: Fetch from DB/env per provider or category.
 */
export function getCommissionConfig(): CommissionConfig {
  return { ...DEFAULT_COMMISSION };
}
