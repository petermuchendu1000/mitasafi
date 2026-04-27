// =============================================================================
// MITASAFI: M-PESA DARAJA API CLIENT (M6 + SI-4)
// =============================================================================
// Server-only library — imported by server actions in payments.ts.
// NOT a "use server" module itself (contains sync utility exports).
//
// Implements:
//   1. OAuth2 token acquisition (with in-memory cache)
//   2. STK Push (Lipa Na M-Pesa Online) — C2B payment initiation
//   3. STK Push Query — check transaction status
//   4. Callback body parsing
//
// Configuration: Loaded via mpesa-config.ts (Zod-validated env vars).
// Reference: https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate
// =============================================================================

import { getMpesaConfig } from "@/lib/payments/mpesa-config";
import type {
  MpesaAuthResponse,
  MpesaStkPushRequest,
  MpesaStkPushResponse,
  MpesaStkQueryRequest,
  MpesaStkQueryResponse,
  MpesaStkCallback,
  MpesaCallbackMetadata,
} from "@/types/payments";

// =============================================================================
// OAuth TOKEN CACHE
// =============================================================================
// Tokens are valid for 3600s (1 hour). We cache with a 5-minute safety margin.

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

/**
 * Get a valid Daraja OAuth2 access token.
 * Reuses cached token if it hasn't expired.
 */
export async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt) {
    return cachedToken;
  }

  const config = getMpesaConfig();
  const credentials = Buffer.from(
    `${config.consumerKey}:${config.consumerSecret}`
  ).toString("base64");

  const response = await fetch(
    `${config.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${credentials}`,
      },
      // No cache — always get fresh when needed
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`[M-Pesa] OAuth failed (${response.status}): ${text}`);
  }

  const data: MpesaAuthResponse = await response.json();
  cachedToken = data.access_token;
  // Expire 5 minutes early to avoid edge cases
  tokenExpiresAt = now + (parseInt(data.expires_in, 10) - 300) * 1000;

  return cachedToken;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Generate the Daraja timestamp in the format YYYYMMDDHHmmss.
 * Uses East Africa Time (Africa/Nairobi, UTC+3) as required by Safaricom.
 *
 * Uses Intl.DateTimeFormat for correct timezone handling without manual offset.
 */
export function generateTimestamp(): string {
  const formatter = new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? "00";

  return `${get("year")}${get("month")}${get("day")}${get("hour")}${get("minute")}${get("second")}`;
}

/**
 * Generate the Daraja password.
 * Formula: Base64(Shortcode + Passkey + Timestamp)
 */
export function generatePassword(shortcode: string, passkey: string, timestamp: string): string {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
}

/**
 * Normalize a Kenyan phone number to the 254XXXXXXXXX format.
 *
 * Accepts:
 *   - 0712345678   → 254712345678
 *   - +254712345678 → 254712345678
 *   - 254712345678  → 254712345678
 *   - 712345678     → 254712345678
 *
 * Throws on invalid format.
 */
export function normalizePhoneNumber(phone: string): string {
  // Strip whitespace, dashes, and plus sign
  const cleaned = phone.replace(/[\s\-+]/g, "");

  // Match various formats
  const match = cleaned.match(/^(?:254|0)?([17]\d{8})$/);
  if (!match) {
    throw new Error(
      `[M-Pesa] Invalid phone number: "${phone}". Expected format: 07XXXXXXXX, +254XXXXXXXX, or 254XXXXXXXX`
    );
  }

  return `254${match[1]}`;
}

// =============================================================================
// STK PUSH (Lipa Na M-Pesa Online)
// =============================================================================

export interface StkPushParams {
  /** Amount in KES (whole number — M-Pesa doesn't support decimals). */
  amount: number;
  /** Customer phone number (any Kenyan format). */
  phoneNumber: string;
  /** Unique reference for this payment (e.g., booking ID prefix). */
  accountReference: string;
  /** Human-readable description shown to customer. */
  transactionDesc: string;
}

export interface StkPushResult {
  success: boolean;
  merchantRequestId?: string;
  checkoutRequestId?: string;
  customerMessage?: string;
  error?: string;
}

/**
 * Initiate an M-Pesa STK Push (Lipa Na M-Pesa Online).
 *
 * This triggers the payment prompt on the customer's phone.
 * The result comes asynchronously via the callback URL.
 */
export async function initiateStkPush(
  params: StkPushParams
): Promise<StkPushResult> {
  try {
    const config = getMpesaConfig();
    const token = await getAccessToken();
    const timestamp = generateTimestamp();
    const password = generatePassword(config.shortcode, config.passkey, timestamp);
    const phone = normalizePhoneNumber(params.phoneNumber);

    // M-Pesa only supports whole numbers
    const amount = Math.round(params.amount);
    if (amount < 1) {
      return { success: false, error: "Amount must be at least KES 1." };
    }
    if (amount > 150000) {
      return { success: false, error: "Amount exceeds M-Pesa transaction limit (KES 150,000)." };
    }

    const requestBody: MpesaStkPushRequest = {
      BusinessShortCode: config.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phone,
      PartyB: config.shortcode,
      PhoneNumber: phone,
      CallBackURL: config.callbackUrl,
      AccountReference: params.accountReference.slice(0, 12), // Max 12 chars
      TransactionDesc: params.transactionDesc.slice(0, 13), // Max 13 chars
    };

    console.log("[M-Pesa] Initiating STK Push:", {
      phone,
      amount,
      reference: requestBody.AccountReference,
    });

    const response = await fetch(
      `${config.baseUrl}/mpesa/stkpush/v1/processrequest`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("[M-Pesa] STK Push HTTP error:", response.status, text);
      return {
        success: false,
        error: `M-Pesa service error (${response.status}). Please try again.`,
      };
    }

    const data: MpesaStkPushResponse = await response.json();

    if (data.ResponseCode !== "0") {
      console.error("[M-Pesa] STK Push rejected:", data);
      return {
        success: false,
        error: data.ResponseDescription || "M-Pesa rejected the request.",
      };
    }

    console.log("[M-Pesa] STK Push initiated:", {
      checkoutRequestId: data.CheckoutRequestID,
      merchantRequestId: data.MerchantRequestID,
    });

    return {
      success: true,
      merchantRequestId: data.MerchantRequestID,
      checkoutRequestId: data.CheckoutRequestID,
      customerMessage: data.CustomerMessage,
    };
  } catch (err) {
    console.error("[M-Pesa] STK Push error:", err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to initiate M-Pesa payment.",
    };
  }
}

// =============================================================================
// STK PUSH QUERY (Check Transaction Status)
// =============================================================================

export interface StkQueryResult {
  success: boolean;
  resultCode?: string;
  resultDesc?: string;
  error?: string;
}

/**
 * Query the status of a previously initiated STK Push.
 *
 * Useful for polling when the callback hasn't arrived yet.
 */
export async function queryStkPushStatus(
  checkoutRequestId: string
): Promise<StkQueryResult> {
  try {
    const config = getMpesaConfig();
    const token = await getAccessToken();
    const timestamp = generateTimestamp();
    const password = generatePassword(config.shortcode, config.passkey, timestamp);

    const requestBody: MpesaStkQueryRequest = {
      BusinessShortCode: config.shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    };

    const response = await fetch(
      `${config.baseUrl}/mpesa/stkpushquery/v1/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("[M-Pesa] STK Query HTTP error:", response.status, text);
      return {
        success: false,
        error: `M-Pesa query error (${response.status}).`,
      };
    }

    const data: MpesaStkQueryResponse = await response.json();

    return {
      success: true,
      resultCode: data.ResultCode,
      resultDesc: data.ResultDesc,
    };
  } catch (err) {
    console.error("[M-Pesa] STK Query error:", err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to query payment status.",
    };
  }
}

// =============================================================================
// CALLBACK PARSING
// =============================================================================

/**
 * Parse the STK Push callback body and extract metadata.
 *
 * Safaricom sends the callback as a POST with JSON body.
 * Metadata items include:
 *   - Amount
 *   - MpesaReceiptNumber
 *   - TransactionDate
 *   - PhoneNumber
 */
export function parseStkCallback(
  body: MpesaStkCallback
): {
  success: boolean;
  checkoutRequestId: string;
  merchantRequestId: string;
  resultCode: number;
  resultDesc: string;
  metadata: MpesaCallbackMetadata | null;
} {
  const cb = body.Body.stkCallback;
  const isSuccess = cb.ResultCode === 0;

  let metadata: MpesaCallbackMetadata | null = null;

  if (isSuccess && cb.CallbackMetadata?.Item) {
    const items = cb.CallbackMetadata.Item;
    const getValue = (name: string): string | number | undefined =>
      items.find((i) => i.Name === name)?.Value;

    metadata = {
      amount: Number(getValue("Amount")) || 0,
      mpesaReceiptNumber: String(getValue("MpesaReceiptNumber") ?? ""),
      transactionDate: String(getValue("TransactionDate") ?? ""),
      phoneNumber: String(getValue("PhoneNumber") ?? ""),
    };
  }

  return {
    success: isSuccess,
    checkoutRequestId: cb.CheckoutRequestID,
    merchantRequestId: cb.MerchantRequestID,
    resultCode: cb.ResultCode,
    resultDesc: cb.ResultDesc,
    metadata,
  };
}
