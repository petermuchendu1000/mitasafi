/**
 * My Reviews Page
 *
 * Server component that fetches the authenticated customer's submitted reviews
 * and renders them inside the customer dashboard shell. Supports pagination
 * via `?page=` search param.
 *
 * Data: getCustomerReviews() from lib/services/reviews.ts
 * Shell: CustomerDashboardShell
 */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/cache/queries";
import { getCustomerReviews } from "@/lib/services/reviews";
import {
  getCustomerUnreadMessageCount,
  getCustomerProfile,
} from "@/lib/services/dashboard";
import {
  CustomerDashboardShell,
  type CustomerShellProfile,
} from "@/components/dashboard/services";
import { CustomerReviewsList } from "./CustomerReviewsList";

export const metadata: Metadata = {
  title: "My Reviews | MitaSafi",
  description: "Reviews you have submitted for service providers.",
};

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function MyReviewsPage({ searchParams }: Props) {
  // ── Auth ────────────────────────────────────────────────────────────────
  const { user, error: authError } = await getCachedUser();
  if (authError || !user) {
    redirect("/login?redirectTo=/dashboard/reviews");
  }

  // ── Parse pagination ────────────────────────────────────────────────────
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  // ── Data (parallel fetch) ───────────────────────────────────────────────
  const [reviewsResult, unreadMessageCount, profileResult] = await Promise.all([
    getCustomerReviews(user.id, page, 10),
    getCustomerUnreadMessageCount(user.id),
    getCustomerProfile(user.id),
  ]);

  const profile = profileResult.profile;

  // Build shell profile
  const shellProfile: CustomerShellProfile = {
    userId: user.id,
    name: profile?.full_name || user.email?.split("@")[0] || "User",
    email: profile?.email || user.email || "",
    avatarUrl: profile?.avatar_url ?? null,
    unreadMessageCount,
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <CustomerDashboardShell profile={shellProfile}>
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Reviews</h1>
          <p className="text-sm text-gray-500 mt-1">
            {reviewsResult.pagination.total > 0
              ? `${reviewsResult.pagination.total} review${reviewsResult.pagination.total !== 1 ? "s" : ""} submitted`
              : "Reviews you leave for providers will appear here"}
          </p>
        </div>

        <CustomerReviewsList
          reviews={reviewsResult.data}
          pagination={reviewsResult.pagination}
        />
      </div>
    </CustomerDashboardShell>
  );
}
