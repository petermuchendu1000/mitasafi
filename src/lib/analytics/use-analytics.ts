// =============================================================================
// MITASAFI: CLIENT-SIDE ANALYTICS HOOK
// =============================================================================
// React hook + utilities for tracking user interactions from client components.
//
// Usage:
//   const { track } = useAnalytics();
//   track("card_click", { providerId: "abc", position: 3 });
//
// Session ID persists in sessionStorage so events within one browsing
// session can be correlated without requiring auth.
// =============================================================================

"use client";

import { useCallback, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  trackEvent,
  logSearchQuery,
  type AnalyticsEventName,
} from "@/lib/analytics/events";

// =============================================================================
// SESSION ID
// =============================================================================

const SESSION_KEY = "mts_sid";

function getSessionId(): string {
  if (typeof window === "undefined") return "";

  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

// =============================================================================
// HOOK
// =============================================================================

export function useAnalytics() {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  /**
   * Track a generic event. Fire-and-forget — never blocks UI.
   */
  const track = useCallback(
    (eventName: AnalyticsEventName, properties?: Record<string, unknown>) => {
      // Intentionally not awaited — fire and forget
      trackEvent({
        eventName,
        properties,
        pagePath: pathnameRef.current,
        referrer: typeof document !== "undefined" ? document.referrer : undefined,
        sessionId: getSessionId(),
      }).catch(() => {
        // Swallow — analytics must never break UX
      });
    },
    []
  );

  /**
   * Log a search query for search analytics.
   */
  const logSearch = useCallback(
    (query: string, resultsCount: number, categoryContext?: string) => {
      logSearchQuery({
        query,
        resultsCount,
        categoryContext,
      }).catch(() => {});
    },
    []
  );

  return { track, logSearch } as const;
}

// =============================================================================
// PAGE VIEW TRACKER (drop-in component)
// =============================================================================
// Place <PageViewTracker /> in layout.tsx to auto-track page_view events.
// =============================================================================

export function PageViewTracker() {
  const { track } = useAnalytics();
  const pathname = usePathname();
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    // Avoid double-fire for the same path (StrictMode)
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;

    track("page_view");
  }, [pathname, track]);

  return null;
}
