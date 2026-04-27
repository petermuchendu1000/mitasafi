// =============================================================================
// MITASAFI: PAYMENT TYPES (M6)
// =============================================================================
// Type definitions for the payment system.
// Mirrors the DB schema in 20260305000000_m6_payment_tables.sql.
//
// Pattern: Manually defined (same as bookings.ts) because the generated
// database.ts doesn't include these tables yet. When types are regenerated,
// these can be replaced with DB-derived types.
// =============================================================================

// =============================================================================
// DATABASE ENUMS
// =============================================================================

/** Maps to `payment_transaction_status` PostgreSQL enum. */
export type PaymentTransactionStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "refunded";

/** Maps to `payout_status` PostgreSQL enum. */
export type PayoutStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

/** Maps to `payment_method_type` PostgreSQL enum. */
export type PaymentMethodType =
  | "mpesa"
  | "card"
  | "cash"
  | "bank_transfer";

// =============================================================================
// ROW TYPES
// =============================================================================

/** Row shape for the `payments` table. */
export interface Payment {
  id: string;
  booking_id: string;
  payer_id: string;
  provider_id: string;

  // Amount
  amount: number;
  currency: string;
  platform_fee: number;
  provider_amount: number;

  // Method
  payment_method: PaymentMethodType;

  // M-Pesa specific
  mpesa_checkout_request_id: string | null;
  mpesa_merchant_request_id: string | null;
  mpesa_receipt_number: string | null;
  mpesa_phone: string | null;
  mpesa_result_code: number | null;
  mpesa_result_desc: string | null;

  // Status
  status: PaymentTransactionStatus;
  failure_reason: string | null;

  // Metadata
  metadata: Record<string, unknown> | null;
  idempotency_key: string | null;

  // Timestamps
  initiated_at: string;
  confirmed_at: string | null;
  failed_at: string | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Insert shape for the `payments` table. */
export interface PaymentInsert {
  booking_id: string;
  payer_id: string;
  provider_id: string;
  amount: number;
  currency?: string;
  platform_fee: number;
  provider_amount: number;
  payment_method?: PaymentMethodType;
  mpesa_checkout_request_id?: string | null;
  mpesa_merchant_request_id?: string | null;
  mpesa_phone?: string | null;
  status?: PaymentTransactionStatus;
  idempotency_key?: string | null;
  metadata?: Record<string, unknown>;
}

/** Row shape for the `provider_payouts` table. */
export interface ProviderPayout {
  id: string;
  provider_id: string;

  // Amount
  amount: number;
  currency: string;

  // Payout method
  payout_method: PaymentMethodType;
  mpesa_phone: string | null;
  bank_name: string | null;
  bank_account: string | null;

  // M-Pesa B2C
  mpesa_conversation_id: string | null;
  mpesa_originator_id: string | null;
  mpesa_receipt_number: string | null;

  // Status
  status: PayoutStatus;
  failure_reason: string | null;
  reference: string | null;

  // Admin
  requested_at: string;
  approved_by: string | null;
  approved_at: string | null;
  processed_at: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/** Insert shape for `provider_payouts`. */
export interface ProviderPayoutInsert {
  provider_id: string;
  amount: number;
  currency?: string;
  payout_method?: PaymentMethodType;
  mpesa_phone?: string | null;
  bank_name?: string | null;
  bank_account?: string | null;
  reference?: string | null;
}

// =============================================================================
// PROVIDER WALLET (columns on service_providers)
// =============================================================================

/** Wallet-related fields on the `service_providers` table. */
export interface ProviderWallet {
  provider_id: string;
  wallet_balance: number;
  total_earnings: number;
}

// =============================================================================
// M-PESA DARAJA API TYPES
// =============================================================================

/** STK Push request body sent to Safaricom Daraja API. */
export interface MpesaStkPushRequest {
  BusinessShortCode: string;
  Password: string;
  Timestamp: string;
  TransactionType: "CustomerPayBillOnline" | "CustomerBuyGoodsOnline";
  Amount: number;
  PartyA: string;  // Customer phone (254...)
  PartyB: string;  // Business shortcode
  PhoneNumber: string; // Same as PartyA
  CallBackURL: string;
  AccountReference: string;
  TransactionDesc: string;
}

/** STK Push initiation response from Daraja. */
export interface MpesaStkPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;  // "0" = success
  ResponseDescription: string;
  CustomerMessage: string;
}

/** STK Push callback body from Daraja. */
export interface MpesaStkCallback {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;  // 0 = success, other = failure
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{
          Name: string;
          Value: string | number;
        }>;
      };
    };
  };
}

/** Parsed callback metadata items. */
export interface MpesaCallbackMetadata {
  amount: number;
  mpesaReceiptNumber: string;
  transactionDate: string;
  phoneNumber: string;
}

/** Daraja OAuth token response. */
export interface MpesaAuthResponse {
  access_token: string;
  expires_in: string;
}

/** STK Push query request. */
export interface MpesaStkQueryRequest {
  BusinessShortCode: string;
  Password: string;
  Timestamp: string;
  CheckoutRequestID: string;
}

/** STK Push query response. */
export interface MpesaStkQueryResponse {
  ResponseCode: string;
  ResponseDescription: string;
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: string;  // "0" = success
  ResultDesc: string;
}

// =============================================================================
// UI / ACTION TYPES
// =============================================================================

/** Data shape for initiating a payment from the client. */
export interface InitiatePaymentRequest {
  bookingId: string;
  phoneNumber: string;  // M-Pesa phone (07XX or 254XX)
  paymentMethod: PaymentMethodType;
}

/** Result shape returned by payment initiation. */
export interface InitiatePaymentResult {
  success: boolean;
  paymentId?: string;
  checkoutRequestId?: string;
  customerMessage?: string;
  error?: string;
}

/** Result shape for payment status checks. */
export interface PaymentStatusResult {
  success: boolean;
  payment?: Payment;
  error?: string;
}

/** Result shape for payout requests. */
export interface PayoutRequestResult {
  success: boolean;
  payoutId?: string;
  error?: string;
}

/** Payment summary for the earnings dashboard. */
export interface EarningsSummary {
  totalEarnings: number;
  walletBalance: number;
  pendingPayouts: number;
  completedPayouts: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
  totalTransactions: number;
  platformFeesTotal: number;
}

/** Individual transaction row for the earnings page. */
export interface EarningsTransaction {
  id: string;
  type: "payment" | "payout";
  amount: number;
  status: PaymentTransactionStatus | PayoutStatus;
  description: string;
  mpesaReceipt: string | null;
  bookingId: string | null;
  createdAt: string;
}

/** Payout request form data. */
export interface PayoutRequestFormData {
  amount: number;
  payoutMethod: PaymentMethodType;
  mpesaPhone?: string;
}

// =============================================================================
// COMMISSION CONFIG
// =============================================================================

/** Platform commission configuration. */
export interface CommissionConfig {
  /** Commission rate as a decimal (e.g., 0.10 for 10%). */
  rate: number;
  /** Minimum platform fee in KES. */
  minimumFee: number;
  /** Maximum platform fee in KES (0 = no cap). */
  maximumFee: number;
  /** Currency code. */
  currency: string;
}
