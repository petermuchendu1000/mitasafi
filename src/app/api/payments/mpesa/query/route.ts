// =============================================================================
// API ROUTE: Query M-Pesa Payment Status
// =============================================================================
// GET /api/payments/mpesa/query?paymentId=xxx
//
// Returns the current status of a payment.
// Optionally polls Daraja if the payment is still pending.
//
// Authentication: Required (payer or provider)
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getPaymentStatus, pollPaymentStatus } from "@/lib/services/payments";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get("paymentId");
    const poll = searchParams.get("poll") === "true";

    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: "Missing paymentId parameter." },
        { status: 400 }
      );
    }

    // UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(paymentId)) {
      return NextResponse.json(
        { success: false, error: "Invalid paymentId format." },
        { status: 400 }
      );
    }

    const result = poll
      ? await pollPaymentStatus(paymentId)
      : await getPaymentStatus(paymentId);

    if (!result.success) {
      return NextResponse.json(result, { status: result.error === "Access denied." ? 403 : 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[API] GET /api/payments/mpesa/query error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
