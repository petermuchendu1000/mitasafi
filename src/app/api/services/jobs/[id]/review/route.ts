/**
 * Review API Route (M7)
 *
 * GET  /api/services/jobs/[id]/review — Fetch the review for a booking
 * POST /api/services/jobs/[id]/review — Submit a review for a booking
 *
 * The [id] param in the URL refers to the booking ID.
 */

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getReviewForBooking,
  submitReview,
} from "@/lib/services/reviews";

// =============================================================================
// GET — Retrieve the review for a booking
// =============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;

    // Authenticate
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { review, error } = await getReviewForBooking(bookingId);

    if (error) {
      return Response.json({ error }, { status: 500 });
    }

    return Response.json({ review });
  } catch (err) {
    console.error("[API] GET /api/services/jobs/[id]/review error:", err);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST — Submit a review for a booking
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;

    // Authenticate
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.rating || typeof body.rating !== "number") {
      return Response.json(
        { error: "rating is required and must be a number (1-5)" },
        { status: 400 }
      );
    }

    const result = await submitReview(bookingId, {
      rating: body.rating,
      title: body.title,
      reviewText: body.reviewText,
      qualityRating: body.qualityRating ?? null,
      communicationRating: body.communicationRating ?? null,
      timelinessRating: body.timelinessRating ?? null,
      professionalismRating: body.professionalismRating ?? null,
      valueRating: body.valueRating ?? null,
      photoUrls: body.photoUrls,
    });

    if (!result.success) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    return Response.json(
      { success: true, reviewId: result.reviewId },
      { status: 201 }
    );
  } catch (err) {
    console.error("[API] POST /api/services/jobs/[id]/review error:", err);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
