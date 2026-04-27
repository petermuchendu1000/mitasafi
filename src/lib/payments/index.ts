// =============================================================================
// MITASAFI: PAYMENTS MODULE — PUBLIC API
// =============================================================================
// Barrel export for the payments subsystem.
//
// Import convention:
//   import { getMpesaConfig, calculateCommission } from "@/lib/payments";
//
// Module structure:
//   mpesa-config.ts  — Configuration, validation, IP whitelist, health check
//   mpesa.ts         — Daraja API client (OAuth, STK Push, Query, Callback parse)
//   commission.ts    — Platform commission calculation
//   refunds.ts       — Refund amount calculation (pure computation)
// =============================================================================

// ─── Configuration & Diagnostics ─────────────────────────────────────────────
export {
  getMpesaConfig,
  isSafaricomIp,
  checkMpesaHealth,
  resetConfigCache,
  type MpesaConfig,
  type MpesaEnvironment,
  type MpesaHealthStatus,
} from "./mpesa-config";

// ─── Daraja API Client ───────────────────────────────────────────────────────
export {
  getAccessToken,
  generateTimestamp,
  generatePassword,
  normalizePhoneNumber,
  initiateStkPush,
  queryStkPushStatus,
  parseStkCallback,
  type StkPushParams,
  type StkPushResult,
  type StkQueryResult,
} from "./mpesa";

// ─── Commission ──────────────────────────────────────────────────────────────
export {
  calculateCommission,
  getCommissionConfig,
  type CommissionBreakdown,
} from "./commission";

// ─── Refunds ─────────────────────────────────────────────────────────────────
export {
  calculateRefund,
  type RefundCalculationInput,
  type RefundBreakdown,
} from "./refunds";
