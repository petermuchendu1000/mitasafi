/**
 * Provider Analytics — Server Actions
 *
 * Pure data-fetching functions for the analytics dashboard.
 * All queries follow the established getCachedDashboardStats pattern:
 *   - Parallel Supabase queries via Promise.all
 *   - Client-side aggregation (Supabase JS doesn't support GROUP BY)
 *   - Regular client (RLS-scoped to authenticated user)
 *   - getCachedProviderId() for auth
 *
 * URL: /dashboard/provider/analytics
 */

"use server";

import { createClient } from "@/lib/supabase/server";
import { getCachedProviderId } from "@/lib/cache/queries";

// =============================================================================
// TYPES
// =============================================================================

export interface MonthlyDataPoint {
  /** ISO month string, e.g. "2026-02" */
  month: string;
  /** Human-readable label, e.g. "Feb" */
  label: string;
  value: number;
}

export interface TopService {
  serviceId: string;
  serviceName: string;
  completedJobs: number;
  revenue: number;
}

export interface ConversionFunnel {
  totalRequests: number;
  quoted: number;
  accepted: number;
  completed: number;
}

export interface RatingBreakdown {
  overall: number;
  totalReviews: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
  dimensions: {
    quality: number;
    communication: number;
    timeliness: number;
    professionalism: number;
    value: number;
  };
}

export interface ResponseTimeStats {
  /** Average minutes from booking creation to provider first response */
  averageMinutes: number;
  /** Median minutes */
  medianMinutes: number;
  /** Number of bookings sampled */
  sampleSize: number;
}

export interface AnalyticsData {
  monthlyJobs: MonthlyDataPoint[];
  monthlyRevenue: MonthlyDataPoint[];
  topServices: TopService[];
  funnel: ConversionFunnel;
  ratingBreakdown: RatingBreakdown;
  responseTime: ResponseTimeStats;
}

export interface AnalyticsResult {
  success: boolean;
  data: AnalyticsData | null;
  error?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Build an array of the last N months as { start, end, month, label }.
 * Months are in descending order (most recent first) but the returned
 * array is reversed to ascending for chart rendering.
 */
function getMonthBoundaries(count: number): Array<{
  start: string;
  end: string;
  month: string;
  label: string;
}> {
  const now = new Date();
  const months: Array<{ start: string; end: string; month: string; label: string }> = [];

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    months.push({
      start: d.toISOString(),
      end: nextMonth.toISOString(),
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-KE", { month: "short" }),
    });
  }

  return months;
}

/** Parse a review_rating enum ('1'..'5') to number, defaulting to 0 */
function parseRating(r: string | null | undefined): number {
  if (!r) return 0;
  const n = parseInt(r, 10);
  return isNaN(n) ? 0 : n;
}

/** Compute average from array, returning 0 for empty */
function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

/** Compute median from sorted array */
function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// =============================================================================
// COMPLETED STATUSES
// =============================================================================

/** Statuses that count as "completed" for revenue/job counting */
const COMPLETED_STATUSES = ["completed", "customer_confirmed"] as const;

/**
 * Statuses meaning the provider actively quoted / engaged.
 * Used for funnel "quoted" step.
 */
const QUOTED_STATUSES = [
  "quote_sent",
  "quote_accepted",
  "confirmed",
  "scheduled",
  "in_progress",
  "partially_completed",
  "completed",
  "customer_confirmed",
  "requires_followup",
  "rework_required",
  "payment_pending",
] as const;

/**
 * Statuses meaning the quote was accepted / job is in progress or done.
 * Used for funnel "accepted" step.
 */
const ACCEPTED_STATUSES = [
  "confirmed",
  "scheduled",
  "in_progress",
  "partially_completed",
  "completed",
  "customer_confirmed",
  "requires_followup",
  "rework_required",
  "payment_pending",
] as const;

// =============================================================================
// MAIN QUERY
// =============================================================================

export async function getProviderAnalytics(): Promise<AnalyticsResult> {
  const { providerId, error: authError } = await getCachedProviderId();

  if (authError || !providerId) {
    return { success: false, data: null, error: authError || "Provider not found" };
  }

  const months = getMonthBoundaries(6);
  const sixMonthsAgo = months[0].start;

  try {
    const supabase = await createClient();

    // All queries in parallel — 5 independent data fetches
    const [
      completedBookingsResult,
      allBookingsResult,
      reviewsResult,
      respondedBookingsResult,
    ] = await Promise.all([
      // 1. Completed bookings in last 6 months (for monthly jobs + revenue + top services)
      supabase
        .from("bookings")
        .select("id, status, agreed_price, completed_at, service_id, metadata")
        .eq("provider_id", providerId)
        .in("status", [...COMPLETED_STATUSES])
        .gte("completed_at", sixMonthsAgo)
        .order("completed_at", { ascending: true }),

      // 2. All bookings for this provider (for funnel)
      supabase
        .from("bookings")
        .select("id, status")
        .eq("provider_id", providerId),

      // 3. All reviews for this provider (for rating breakdown)
      supabase
        .from("reviews")
        .select(
          "rating, quality_rating, communication_rating, timeliness_rating, professionalism_rating, value_rating",
        )
        .eq("provider_id", providerId)
        .eq("is_hidden", false),

      // 4. Bookings with response timestamps (for response time)
      supabase
        .from("bookings")
        .select("created_at, provider_responded_at")
        .eq("provider_id", providerId)
        .not("provider_responded_at", "is", null)
        .gte("created_at", sixMonthsAgo),
    ]);

    // ── Monthly Jobs ──────────────────────────────────────────────────────
    const completedBookings: Array<{
      id: string;
      status: string | null;
      agreed_price: number | null;
      completed_at: string | null;
      service_id: string;
      metadata: unknown;
    }> = completedBookingsResult.data || [];

    const monthlyJobs: MonthlyDataPoint[] = months.map((m) => {
      const count = completedBookings.filter(
        (b) => b.completed_at != null && b.completed_at >= m.start && b.completed_at < m.end,
      ).length;
      return { month: m.month, label: m.label, value: count };
    });

    // ── Monthly Revenue ───────────────────────────────────────────────────
    const monthlyRevenue: MonthlyDataPoint[] = months.map((m) => {
      const total = completedBookings
        .filter((b) => b.completed_at != null && b.completed_at >= m.start && b.completed_at < m.end)
        .reduce((sum, b) => sum + (b.agreed_price || 0), 0);
      return { month: m.month, label: m.label, value: Math.round(total) };
    });

    // ── Top Services by Revenue ───────────────────────────────────────────
    const serviceMap = new Map<
      string,
      { serviceId: string; revenue: number; count: number }
    >();

    for (const b of completedBookings) {
      const sid = b.service_id;
      const existing = serviceMap.get(sid) || { serviceId: sid, revenue: 0, count: 0 };
      existing.revenue += b.agreed_price || 0;
      existing.count += 1;
      serviceMap.set(sid, existing);
    }

    // Resolve service names in a single batch query
    const serviceIds = [...serviceMap.keys()];
    let serviceNameMap: Record<string, string> = {};

    if (serviceIds.length > 0) {
      const { data: servicesData } = await supabase
        .from("services")
        .select("id, name")
        .in("id", serviceIds);

      if (servicesData) {
        for (const s of servicesData as Array<{ id: string; name: string }>) {
          serviceNameMap[s.id] = s.name;
        }
      }
    }

    const topServices: TopService[] = [...serviceMap.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((s) => ({
        serviceId: s.serviceId,
        serviceName: serviceNameMap[s.serviceId] || "Unknown Service",
        completedJobs: s.count,
        revenue: Math.round(s.revenue),
      }));

    // ── Conversion Funnel ─────────────────────────────────────────────────
    const allBookings: Array<{ id: string; status: string | null }> =
      allBookingsResult.data || [];

    const funnel: ConversionFunnel = {
      totalRequests: allBookings.length,
      quoted: allBookings.filter((b) =>
        b.status != null && (QUOTED_STATUSES as readonly string[]).includes(b.status),
      ).length,
      accepted: allBookings.filter((b) =>
        b.status != null && (ACCEPTED_STATUSES as readonly string[]).includes(b.status),
      ).length,
      completed: allBookings.filter((b) =>
        b.status != null && (COMPLETED_STATUSES as readonly string[]).includes(b.status),
      ).length,
    };

    // ── Rating Breakdown ──────────────────────────────────────────────────
    const reviews: Array<{
      rating: string;
      quality_rating: string | null;
      communication_rating: string | null;
      timeliness_rating: string | null;
      professionalism_rating: string | null;
      value_rating: string | null;
    }> = reviewsResult.data || [];

    const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    const dimArrays = {
      quality: [] as number[],
      communication: [] as number[],
      timeliness: [] as number[],
      professionalism: [] as number[],
      value: [] as number[],
    };

    for (const r of reviews) {
      const rating = parseRating(r.rating) as 1 | 2 | 3 | 4 | 5;
      if (rating >= 1 && rating <= 5) {
        distribution[rating]++;
      }

      const q = parseRating(r.quality_rating);
      if (q > 0) dimArrays.quality.push(q);

      const c = parseRating(r.communication_rating);
      if (c > 0) dimArrays.communication.push(c);

      const t = parseRating(r.timeliness_rating);
      if (t > 0) dimArrays.timeliness.push(t);

      const p = parseRating(r.professionalism_rating);
      if (p > 0) dimArrays.professionalism.push(p);

      const v = parseRating(r.value_rating);
      if (v > 0) dimArrays.value.push(v);
    }

    const ratings = reviews.map((r) => parseRating(r.rating)).filter((n) => n > 0);

    const ratingBreakdown: RatingBreakdown = {
      overall: ratings.length > 0 ? Math.round(avg(ratings) * 10) / 10 : 0,
      totalReviews: reviews.length,
      distribution,
      dimensions: {
        quality: Math.round(avg(dimArrays.quality) * 10) / 10,
        communication: Math.round(avg(dimArrays.communication) * 10) / 10,
        timeliness: Math.round(avg(dimArrays.timeliness) * 10) / 10,
        professionalism: Math.round(avg(dimArrays.professionalism) * 10) / 10,
        value: Math.round(avg(dimArrays.value) * 10) / 10,
      },
    };

    // ── Response Time ─────────────────────────────────────────────────────
    const respondedBookings: Array<{
      created_at: string | null;
      provider_responded_at: string | null;
    }> = respondedBookingsResult.data || [];

    const responseTimes = respondedBookings
      .filter((b) => b.created_at != null && b.provider_responded_at != null)
      .map((b) => {
        const created = new Date(b.created_at!).getTime();
        const responded = new Date(b.provider_responded_at!).getTime();
        return Math.max(0, (responded - created) / 60_000); // minutes
      })
      .sort((a, b) => a - b);

    const responseTime: ResponseTimeStats = {
      averageMinutes: Math.round(avg(responseTimes)),
      medianMinutes: Math.round(median(responseTimes)),
      sampleSize: responseTimes.length,
    };

    return {
      success: true,
      data: {
        monthlyJobs,
        monthlyRevenue,
        topServices,
        funnel,
        ratingBreakdown,
        responseTime,
      },
    };
  } catch (error) {
    console.error("[Analytics] Query error:", error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Failed to load analytics",
    };
  }
}
