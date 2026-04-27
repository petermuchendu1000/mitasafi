// Analytics barrel export
export { trackEvent, logSearchQuery, updateSearchClick } from "./events";
export type { AnalyticsEventName, TrackEventPayload, LogSearchPayload } from "./events";
export { useAnalytics, PageViewTracker } from "./use-analytics";
