// =============================================================================
// MITASAFI: ANALYTICS EVENT TRACKING
// =============================================================================
// Lightweight analytics for the services marketplace.
//
// Architecture:
//   Client → server action (trackEvent) → Supabase analytics_events table
//   Client → server action (logSearch) → Supabase search_queries table
//
// Event taxonomy:
//   page_view      — User views a page
//   search         — User performs a search
//   filter_change  — User modifies filters
//   card_click     — User clicks a provider card
//   card_impression— Provider card enters viewport
//   detail_view    — User views a provider detail page
//   booking_start  — User opens booking request form
//   booking_submit — User submits a booking request
//   share_click    — User shares a provider
//   compare_add    — User adds provider to compare
//   compare_view   — User opens comparison panel
//
// All functions are fire-and-forget — failures are logged, never thrown.
// =============================================================================

"use server";

import { createClient } from "@/lib/supabase/server";

// =============================================================================
// TYPES
// =============================================================================

/** Standardized event names for type safety. */
export type AnalyticsEventName =
  | "page_view"
  | "search"
  | "filter_change"
  | "card_click"
  | "card_impression"
  | "detail_view"
  | "booking_start"
  | "booking_submit"
  | "share_click"
  | "compare_add"
  | "compare_view"
  | "review_submit"
  | "category_click";

export interface TrackEventPayload {
  eventName: AnalyticsEventName;
  properties?: Record<string, unknown>;
  pagePath?: string;
  referrer?: string;
  sessionId?: string;
}

export interface LogSearchPayload {
  query: string;
  resultsCount: number;
  categoryContext?: string;
  clickedProviderId?: string;
}

// =============================================================================
// SERVER ACTIONS
// =============================================================================

/**
 * Track a generic analytics event.
 *
 * Fire-and-forget — never throws. Returns `{ ok: true }` on success.
 */
export async function trackEvent(payload: TrackEventPayload): Promise<{ ok: boolean }> {
  try {
    const supabase = await createClient();

    // Get user ID if authenticated (optional — anon tracking supported)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Tables created by migration 20260305090000_analytics_tables.sql
    // Type-cast needed until `npx supabase gen types` is re-run.
    const { error } = await (supabase.from as any)("analytics_events").insert({
      event_name: payload.eventName,
      user_id: user?.id ?? null,
      session_id: payload.sessionId ?? null,
      properties: payload.properties ?? {},
      page_path: payload.pagePath ?? null,
      referrer: payload.referrer ?? null,
      // user_agent set client-side if needed; omit server-side
    });

    if (error) {
      console.error("[analytics] trackEvent insert failed:", error.message);
      return { ok: false };
    }

    return { ok: true };
  } catch (err) {
    console.error("[analytics] trackEvent error:", err);
    return { ok: false };
  }
}

/**
 * Log a search query for search analytics.
 *
 * Fire-and-forget — never throws.
 */
export async function logSearchQuery(payload: LogSearchPayload): Promise<{ ok: boolean }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Table created by migration 20260305090000_analytics_tables.sql
    const { error } = await (supabase.from as any)("search_queries").insert({
      query: payload.query.slice(0, 500), // Truncate long queries
      user_id: user?.id ?? null,
      results_count: payload.resultsCount,
      category_context: payload.categoryContext ?? null,
      clicked_provider_id: payload.clickedProviderId ?? null,
    });

    if (error) {
      console.error("[analytics] logSearchQuery insert failed:", error.message);
      return { ok: false };
    }

    return { ok: true };
  } catch (err) {
    console.error("[analytics] logSearchQuery error:", err);
    return { ok: false };
  }
}

/**
 * Update a search query record when user clicks a result.
 *
 * Called from client after user clicks a provider from search results.
 */
export async function updateSearchClick(
  searchQueryId: string,
  clickedProviderId: string
): Promise<{ ok: boolean }> {
  try {
    const supabase = await createClient();

    const { error } = await (supabase.from as any)("search_queries")
      .update({ clicked_provider_id: clickedProviderId })
      .eq("id", searchQueryId);

    if (error) {
      console.error("[analytics] updateSearchClick failed:", error.message);
      return { ok: false };
    }

    return { ok: true };
  } catch (err) {
    console.error("[analytics] updateSearchClick error:", err);
    return { ok: false };
  }
}
