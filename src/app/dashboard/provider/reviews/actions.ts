"use server";

// =============================================================================
// MITASAFI: PROVIDER REVIEWS — SERVER ACTIONS (M7)
// =============================================================================
// Server actions for the provider reviews dashboard page.
// Re-exports from reviews.ts for clean imports from the page.
// =============================================================================

import { submitProviderResponse as _submitProviderResponse } from "@/lib/services/reviews";

export async function submitProviderResponse(reviewId: string, response: string) {
  return _submitProviderResponse(reviewId, response);
}
