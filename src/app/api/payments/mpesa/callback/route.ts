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
//   1. IP whitelist — FAIL CLOSED: only positively-whitelisted Safaricom IPs,
//      read from a proxy position our own edge wrote, are ever processed
//   2. CheckoutRequestID match — only processes callbacks for known payments
//   3. Idempotency — already-completed payments are safely skipped
//   4. Body size guard — rejects abnormally large payloads
//   5. Always returns 200 — prevents information leakage on failures
// =============================================================================

import { NextResponse } from "next/server";
import { parseStkCallback } from "@/lib/payments/mpesa";
import {
  authorizeCallbackIp,
  extractTrustedClientIp,
  getMpesaConfig,
  getTrustedProxyHops,
  isInsecureCallbackModeEnabled,
} from "@/lib/payments/mpesa-config";
import type { MpesaEnvironment } from "@/lib/payments/mpesa-config";
import { processPaymentCallback } from "@/lib/services/payments";
import type { MpesaStkCallback } from "@/types/payments";

/** Safaricom callbacks should never exceed this size. */
const MAX_BODY_SIZE_BYTES = 10_000; // 10 KB — generous upper bound

/** Standard acknowledgment response that Safaricom expects. */
const ACK_RESPONSE = { ResultCode: 0, ResultDesc: "Accepted" };

// =============================================================================
// SECURITY FIX — SPOOFABLE CLIENT IP (SEV-0)
// =============================================================================
// WHAT WAS WRONG: getClientIp() returned x-forwarded-for.split(",")[0] — the
// FIRST element of a CLIENT-SUPPLIED header. A proxy chain is built by
// PREPENDING the untrusted client value and APPENDING what each proxy actually
// saw, so element [0] is attacker input verbatim. Paired with a whitelist that
// contained 127.0.0. and 192.168., a bare `x-forwarded-for: 127.0.0.1` was a
// complete authentication bypass against PRODUCTION.
//
// WHY THE NEW CODE IS SAFE: extractTrustedClientIp() prefers a single-value
// header the platform itself writes (fly-client-ip on Fly.io, which is where
// this app runs — the old comments here assumed Vercel; configurable via
// MPESA_TRUSTED_CLIENT_IP_HEADER for Vercel-style x-real-ip), and otherwise
// indexes x-forwarded-for from the RIGHT by an explicit, configurable
// trusted-hop count (MPESA_TRUSTED_PROXY_HOPS, default 1 = one appending edge,
// true for both fly-proxy and Vercel). No position a client can prepend is
// ever read, there is no fallback to a client-settable x-real-ip, and anything
// unresolvable yields null, which is DENIED below.
// =============================================================================

export async function POST(request: Request) {
  const requestId = crypto.randomUUID().slice(0, 8); // Short ID for log correlation

  try {
    // ── Security Layer 1: IP whitelist (FAIL CLOSED) ──
    // SECURITY FIX — FAIL-OPEN AUTHENTICATION (SEV-0)
    // WHAT WAS WRONG: this block defaulted `environment` to "sandbox" and, on
    // a getMpesaConfig() throw, kept that default with the comment "default to
    // sandbox (permissive)". isSafaricomIp() then returned true for EVERY IP
    // in sandbox, so a config error (or any deploy with MPESA_ENVIRONMENT
    // unset) turned this endpoint into an open settlement-callback writer —
    // the gateway to an unbounded provider-wallet mint.
    // WHY THE NEW CODE IS SAFE: a config error now REJECTS the callback. There
    // is no permissive default: `environment` starts as null and a null
    // environment means deny, unless an operator has deliberately enabled
    // insecure local mode (MPESA_ALLOW_INSECURE_CALLBACKS=true plus an
    // explicit MPESA_ENVIRONMENT=sandbox plus a non-production app env), which
    // logs loudly. Rejection still answers HTTP 200, by design, so Safaricom
    // never retry-storms us and we leak nothing about the validation.
    const { ip: clientIp, source: ipSource, reason: ipReason } =
      extractTrustedClientIp(request.headers);

    let environment: MpesaEnvironment | null = null;
    try {
      environment = getMpesaConfig().environment;
    } catch (configErr) {
      console.error(
        `[M-Pesa Callback:${requestId}] M-Pesa config failed to validate:`,
        configErr instanceof Error ? configErr.message : configErr
      );
    }

    if (environment === null) {
      if (!isInsecureCallbackModeEnabled()) {
        console.error(
          `[M-Pesa Callback:${requestId}] Rejected — config unavailable, failing CLOSED (not processing):`,
          { ip: clientIp, ipSource }
        );
        return NextResponse.json(ACK_RESPONSE, { status: 200 });
      }
      console.warn(
        `[M-Pesa Callback:${requestId}] Config unavailable but insecure local callback mode is explicitly enabled; continuing in sandbox mode.`
      );
      environment = "sandbox";
    }

    const ipDecision = authorizeCallbackIp(clientIp, environment);

    if (!ipDecision.allowed) {
      console.warn(`[M-Pesa Callback:${requestId}] Rejected — IP not whitelisted:`, {
        ip: ipDecision.ip,
        ipSource,
        ipReason,
        decision: ipDecision.reason,
        env: environment,
        trustedProxyHops: getTrustedProxyHops(),
      });
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
      ip: ipDecision.ip,
      ipSource,
      ipDecision: ipDecision.reason,
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
