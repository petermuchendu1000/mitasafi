// =============================================================================
// API ROUTE: M-Pesa STK Push Callback
// =============================================================================
// POST /api/payments/mpesa/callback
//
// Receives payment confirmation/failure callbacks from Safaricom Daraja.
//
// IMPORTANT:
//   - This endpoint is called by Safaricom's servers, NOT by our frontend
//   - Must respond with HTTP 200 quickly to acknowledge receipt
//   - The callback URL must be publicly accessible (not localhost)
//   - Idempotent: duplicate callbacks for the same CheckoutRequestID are safe
//
// Security layers:
//   1. IP whitelist — production rejects requests not from Safaricom IPs
//   2. CheckoutRequestID match — only processes callbacks for known payments
//   3. Idempotency — already-completed payments are safely skipped
//   4. Body size guard — rejects abnormally large payloads
//   5. Always returns 200 — prevents information leakage on failures
// =============================================================================

import { NextResponse } from "next/server";
import { parseStkCallback } from "@/lib/payments/mpesa";
import { getMpesaConfig, isSafaricomIp } from "@/lib/payments/mpesa-config";
import { processPaymentCallback } from "@/lib/services/payments";
import type { MpesaStkCallback } from "@/types/payments";

/** Safaricom callbacks should never exceed this size. */
const MAX_BODY_SIZE_BYTES = 10_000; // 10 KB — generous upper bound

/** Standard acknowledgment response that Safaricom expects. */
const ACK_RESPONSE = { ResultCode: 0, ResultDesc: "Accepted" };

/**
 * Extract the client IP from request headers.
 * Vercel sets x-forwarded-for; other proxies may use x-real-ip.
 */
function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for can be "client, proxy1, proxy2" — take the first
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip");
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID().slice(0, 8); // Short ID for log correlation

  try {
    // ── Security Layer 1: IP whitelist ──
    const clientIp = getClientIp(request);
    let environment: "sandbox" | "production" = "sandbox";

    try {
      const config = getMpesaConfig();
      environment = config.environment;
    } catch {
      // Config not loaded — default to sandbox (permissive) for this check.
      // The callback will fail later at processPaymentCallback if config is
      // genuinely broken, but we still want to log the attempt.
      console.warn(`[M-Pesa Callback:${requestId}] Config not loaded; defaulting IP check to sandbox mode.`);
    }

    if (!isSafaricomIp(clientIp, environment)) {
      console.warn(`[M-Pesa Callback:${requestId}] Rejected — IP not whitelisted:`, clientIp);
      // Return 200 to avoid leaking information about our validation
      return NextResponse.json(ACK_RESPONSE, { status: 200 });
    }

    // ── Security Layer 2: Body size guard ──
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE_BYTES) {
      console.warn(`[M-Pesa Callback:${requestId}] Rejected — body too large: ${contentLength} bytes`);
      return NextResponse.json(ACK_RESPONSE, { status: 200 });
    }

    const body: MpesaStkCallback = await request.json();

    // ── Structural validation ──
    if (!body?.Body?.stkCallback) {
      console.error(
        `[M-Pesa Callback:${requestId}] Invalid body structure:`,
        JSON.stringify(body).slice(0, 500)
      );
      return NextResponse.json(ACK_RESPONSE, { status: 200 });
    }

    // ── Parse the callback ──
    const parsed = parseStkCallback(body);

    console.log(`[M-Pesa Callback:${requestId}] Received:`, {
      ip: clientIp,
      env: environment,
      checkoutRequestId: parsed.checkoutRequestId,
      resultCode: parsed.resultCode,
      resultDesc: parsed.resultDesc,
      hasMetadata: !!parsed.metadata,
    });

    // ── Process the callback (updates payment + booking + wallet) ──
    const result = await processPaymentCallback({
      checkoutRequestId: parsed.checkoutRequestId,
      merchantRequestId: parsed.merchantRequestId,
      resultCode: parsed.resultCode,
      resultDesc: parsed.resultDesc,
      metadata: parsed.metadata,
    });

    if (!result.success) {
      console.error(`[M-Pesa Callback:${requestId}] Processing failed:`, result.error);
    } else {
      console.log(`[M-Pesa Callback:${requestId}] Processed successfully:`, {
        paymentId: result.paymentId,
      });
    }

    // Always return 200 to Safaricom
    return NextResponse.json(ACK_RESPONSE, { status: 200 });
  } catch (err) {
    console.error(`[M-Pesa Callback:${requestId}] Unhandled error:`, err);
    // Still return 200 — we don't want Safaricom to retry on parsing errors
    return NextResponse.json(ACK_RESPONSE, { status: 200 });
  }
}
