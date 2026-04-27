// =============================================================================
// API ROUTE: Initiate M-Pesa Payment
// =============================================================================
// POST /api/payments/mpesa/initiate
//
// Initiates an M-Pesa STK Push for a booking payment.
//
// Request body:
//   { bookingId: string, phoneNumber: string, paymentMethod?: string }
//
// Response:
//   { success: true, paymentId, checkoutRequestId, customerMessage }
//   { success: false, error }
//
// Authentication: Required (customer must be signed in)
// =============================================================================

import { NextResponse } from "next/server";
import { initiatePayment } from "@/lib/services/payments";
import { z } from "zod";

const initiateSchema = z.object({
  bookingId: z.string().uuid("Invalid booking ID."),
  phoneNumber: z
    .string()
    .min(9, "Phone number is too short.")
    .max(15, "Phone number is too long.")
    .regex(/^[+\d\s-]+$/, "Invalid phone number format."),
  paymentMethod: z.enum(["mpesa", "card", "cash", "bank_transfer"]).default("mpesa"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const parsed = initiateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || "Invalid request data.",
        },
        { status: 400 }
      );
    }

    const { bookingId, phoneNumber, paymentMethod } = parsed.data;

    const result = await initiatePayment(bookingId, phoneNumber, paymentMethod);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[API] POST /api/payments/mpesa/initiate error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error. Please try again.",
      },
      { status: 500 }
    );
  }
}
