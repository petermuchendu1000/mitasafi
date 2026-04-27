/**
 * ServicesAreaCoverage — Nairobi Neighborhood Coverage Grid
 *
 * Displays the service areas MitaSafi covers, grouped by region.
 * Each area is a clickable chip-link that navigates to the marketplace
 * filtered by that area.
 *
 * Server component — pure static rendering with no client JS.
 *
 * Data source: `AREA_GROUPS` from `@/lib/constants` — canonical area groupings.
 *
 * Design:
 * - Gray background (bg-gray-50)
 * - Area chips: rounded-full pills with subtle border, brand hover accent
 * - Grouped under region headers (uppercase, tracking-wider)
 * - "Search Your Area" CTA scrolls back to hero search (#services-hero-heading)
 * - Teal brand accents on hover states and CTA
 *
 * @see SERVICES_LANDING_PAGE_SPECIFICATION.md §3 Section 7, SLP-8
 */

import Link from "next/link";
import { Section, SectionHeader } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { AREA_GROUPS } from "@/lib/constants";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Region group display order.
 * Keys match AREA_GROUPS from constants — iterated in visual order.
 */
const REGION_ORDER = [
  "Central & West",
  "South",
  "North & East",
] as const;

// =============================================================================
// AREA CHIP
// =============================================================================

function AreaChip({ area }: { area: string }) {
  return (
    <Link
      href={`/services/browse?area=${encodeURIComponent(area)}`}
      className="inline-block border border-gray-200 bg-white hover:border-brand-300 hover:bg-brand-50 text-gray-700 hover:text-brand-700 px-4 py-2 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
    >
      {area}
    </Link>
  );
}

// =============================================================================
// REGION GROUP
// =============================================================================

function RegionGroup({
  regionName,
  areas,
}: {
  regionName: string;
  areas: readonly string[];
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
        {regionName}
      </p>
      <div className="flex flex-wrap gap-2">
        {areas.map((area) => (
          <AreaChip key={area} area={area} />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ServicesAreaCoverage() {
  return (
    <Section background="gray" padding="md" id="service-areas">
      <Container size="default">
        <SectionHeader
          eyebrow="Coverage"
          title="We Cover All of Nairobi"
          description="Find service providers in your neighborhood"
        />

        {/* Region Groups */}
        <nav aria-label="Service areas" className="mt-12 lg:mt-16 space-y-8">
          {REGION_ORDER.map((region) => {
            const areas = AREA_GROUPS[region];
            return (
              <RegionGroup key={region} regionName={region} areas={areas} />
            );
          })}
        </nav>

        {/* Additional coverage note */}
        <p className="mt-8 text-sm text-gray-500 text-center">
          + 30 more neighborhoods across Greater Nairobi
        </p>

        {/* CTA — scrolls back to hero search */}
        <div className="mt-8 text-center">
          <Link
            href="#services-hero-heading"
            className={cn(
              buttonVariants({ variant: "secondary", size: "md" }),
              "group"
            )}
          >
            Search Your Area
            <span
              className="inline-block transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            >
              &rarr;
            </span>
          </Link>
        </div>
      </Container>
    </Section>
  );
}
