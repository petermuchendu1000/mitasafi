/**
 * ServicesTrustBar — Social Proof Statistics Strip
 *
 * Horizontal bar of 4 platform statistics displayed immediately
 * below the hero. Builds instant credibility with real numbers.
 *
 * Server component — pure static rendering with no client JS.
 * Stats are hardcoded for now; will be API-driven in a future milestone.
 *
 * @see SERVICES_LANDING_PAGE_SPECIFICATION.md §3 Section 2
 */

import { Container } from "@/components/ui/Container";

// =============================================================================
// TRUST STATS DATA
// =============================================================================

/**
 * Platform statistics for the trust bar.
 *
 * These are aspirational launch numbers. Once the platform has real data,
 * replace with a server-side fetch from aggregate views:
 *   - service_providers count (where status = 'active')
 *   - service_categories count
 *   - avg(average_rating) from providers
 *   - bookings count (where status = 'completed')
 */
const TRUST_STATS = [
  { value: "700+", label: "Verified Providers" },
  { value: "20+", label: "Service Categories" },
  { value: "4.8\u2605", label: "Average Rating" },
  { value: "50,000+", label: "Jobs Completed" },
] as const;

// =============================================================================
// COMPONENT
// =============================================================================

export function ServicesTrustBar() {
  return (
    <section
      className="bg-white border-y border-gray-100"
      aria-label="Platform statistics"
    >
      <Container size="wide">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 py-8 lg:py-10">
          {TRUST_STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                {value}
              </p>
              <p className="text-sm text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
