/**
 * ServicesPricingPreview — Transparent Pricing Section
 *
 * Displays price ranges by service category in a clean table (desktop)
 * or stacked cards (mobile) to set customer expectations before booking.
 *
 * Server component — pure static rendering with no client JS.
 * Data is hardcoded from the MitaSafi Service Constitution pricing
 * and will eventually be replaced by live aggregate queries.
 *
 * Design:
 * - White background
 * - Desktop: clean semantic `<table>` with hover rows
 * - Mobile: stacked cards per category
 * - `id="pricing"` — anchor target for navbar "Pricing" link
 * - No icons anywhere — clean text + numbers
 * - Disclaimer at bottom, followed by "Get a Free Quote" CTA
 *
 * @see SERVICES_LANDING_PAGE_SPECIFICATION.md §3 Section 8, SLP-9
 */

import Link from "next/link";
import { Section, SectionHeader } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

interface PricingRow {
  readonly category: string;
  readonly slug: string;
  readonly startingFrom: number;
  readonly rangeMax: number;
}

// =============================================================================
// DATA — CONSTITUTION PRICING (§3 Section 8)
// =============================================================================

const PRICING_DATA: readonly PricingRow[] = [
  { category: "Plumbing", slug: "plumbing", startingFrom: 500, rangeMax: 5_000 },
  { category: "Electrical", slug: "electrical", startingFrom: 800, rangeMax: 8_000 },
  { category: "Cleaning", slug: "cleaning", startingFrom: 1_500, rangeMax: 6_000 },
  { category: "Moving & Relocation", slug: "moving-relocation", startingFrom: 3_000, rangeMax: 25_000 },
  { category: "Painting", slug: "painting", startingFrom: 2_000, rangeMax: 15_000 },
  { category: "Carpentry", slug: "carpentry", startingFrom: 1_000, rangeMax: 10_000 },
  { category: "Laundry", slug: "laundry", startingFrom: 300, rangeMax: 2_000 },
  { category: "Pest Control", slug: "pest-control", startingFrom: 2_500, rangeMax: 8_000 },
  { category: "Water & Gas Delivery", slug: "water-gas-delivery", startingFrom: 200, rangeMax: 3_000 },
  { category: "Internet & Networking", slug: "internet-networking", startingFrom: 1_000, rangeMax: 5_000 },
  { category: "Gardening & Landscaping", slug: "gardening-landscaping", startingFrom: 1_500, rangeMax: 8_000 },
  { category: "Welding & Metal Works", slug: "welding-metal-works", startingFrom: 2_000, rangeMax: 20_000 },
] as const;

// =============================================================================
// FORMATTING HELPERS
// =============================================================================

/**
 * Format a KES amount with thousands separator.
 * Example: 5000 → "5,000" | 25000 → "25,000"
 */
function formatKES(amount: number): string {
  return amount.toLocaleString("en-KE");
}

// =============================================================================
// DESKTOP TABLE ROW
// =============================================================================

function PricingTableRow({ row }: { row: PricingRow }) {
  const browseHref = `/services/browse?category=${row.slug}`;

  return (
    <tr className="border-b border-gray-100 transition-colors hover:bg-gray-50">
      <td className="py-4 pr-4 text-base font-medium text-gray-900">
        {row.category}
      </td>
      <td className="py-4 px-4 text-base font-semibold text-gray-900 tabular-nums">
        KES {formatKES(row.startingFrom)}
      </td>
      <td className="py-4 px-4 text-base font-semibold text-gray-900 tabular-nums">
        KES {formatKES(row.startingFrom)} – {formatKES(row.rangeMax)}
      </td>
      <td className="py-4 pl-4 text-right">
        <Link
          href={browseHref}
          className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 rounded"
        >
          View
        </Link>
      </td>
    </tr>
  );
}

// =============================================================================
// MOBILE CARD
// =============================================================================

function PricingCard({ row }: { row: PricingRow }) {
  const browseHref = `/services/browse?category=${row.slug}`;

  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
      <div>
        <p className="text-base font-medium text-gray-900">{row.category}</p>
        <p className="mt-1 text-sm text-gray-500 tabular-nums">
          KES {formatKES(row.startingFrom)} – {formatKES(row.rangeMax)}
        </p>
      </div>
      <Link
        href={browseHref}
        className="ml-4 shrink-0 text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 rounded"
      >
        View
      </Link>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ServicesPricingPreview() {
  return (
    <Section background="white" padding="md" id="pricing">
      <Container size="default">
        <SectionHeader
          eyebrow="Pricing"
          title="Transparent Pricing"
          description="Know what to expect before you book"
          eyebrowColor="cta"
        />

        {/* Desktop Table — hidden on mobile */}
        <div className="mt-12 lg:mt-16 hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Category
                </th>
                <th className="pb-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Starting From
                </th>
                <th className="pb-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Typical Range
                </th>
                <th className="pb-3 pl-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {PRICING_DATA.map((row) => (
                <PricingTableRow key={row.slug} row={row} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards — hidden on desktop */}
        <div className="mt-10 sm:hidden space-y-3">
          {PRICING_DATA.map((row) => (
            <PricingCard key={row.slug} row={row} />
          ))}
        </div>

        {/* Disclaimer */}
        <p className="mt-8 text-center text-sm text-gray-500">
          Prices vary by scope, location, and provider experience.
          All quotes are free and non-binding.
        </p>

        {/* CTA */}
        <div className="mt-6 text-center">
          <Link
            href="/services/browse"
            className={cn(buttonVariants({ variant: "primary", size: "lg" }))}
          >
            Get a Free Quote →
          </Link>
        </div>
      </Container>
    </Section>
  );
}
