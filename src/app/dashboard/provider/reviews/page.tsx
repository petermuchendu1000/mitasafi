/**
 * Provider Reviews Dashboard Page (M7)
 *
 * URL: /dashboard/provider/reviews
 *
 * Displays all reviews received by the provider with:
 *   - Rating summary (average, distribution, dimension averages)
 *   - Filterable/sortable review list
 *   - Provider response capability per review
 */

import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCachedProviderId } from "@/lib/cache/queries";
import {
  getProviderReviewsWithVotes,
  getProviderReviewSummary,
} from "@/lib/services/reviews";
import { ProviderReviewsClient } from "./ProviderReviewsClient";

// =============================================================================
// METADATA
// =============================================================================

export const metadata: Metadata = {
  title: "Reviews | Provider Dashboard | MitaSafi",
  description: "View and respond to customer reviews.",
};

// =============================================================================
// PAGE
// =============================================================================

export default async function ProviderReviewsPage() {
  const { providerId, error: authError } = await getCachedProviderId();

  if (authError || !providerId) {
    redirect("/login?redirectTo=/dashboard/provider/reviews");
  }

  // Fetch initial data in parallel
  const [reviewsResult, summary] = await Promise.all([
    getProviderReviewsWithVotes({
      providerId,
      page: 1,
      pageSize: 10,
      sortBy: "newest",
    }),
    getProviderReviewSummary(providerId),
  ]);

  return (
    <ProviderReviewsClient
      providerId={providerId}
      initialReviews={reviewsResult}
      summary={summary}
    />
  );
}
