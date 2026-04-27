/**
 * Services Landing Page — `/services`
 *
 * Primary entry point for customers seeking home services and
 * the primary recruitment funnel for service providers.
 *
 * This is NOT the marketplace browser (that's `/services/browse`).
 * This is the hook — the first impression that converts a Google
 * searcher into a MitaSafi user.
 *
 * @see SERVICES_LANDING_PAGE_SPECIFICATION.md for the full blueprint.
 *
 * Sections are assembled incrementally per milestones SLP-3 through SLP-12.
 */

import type { Metadata } from "next";
import { Footer } from "@/components/landing/Footer";
import {
  ServicesNavbar,
  ServicesHero,
  ServicesTrustBar,
  ServicesCategoryGrid,
  ServicesHowItWorks,
  ServicesFeaturedProviders,
  ServicesWhyMitaSafi,
  ServicesAreaCoverage,
  ServicesPricingPreview,
  ServicesTestimonials,
  ServicesProviderCTA,
  ServicesFinalCTA,
  ServicesFAQ,
} from "@/components/services-landing";
import { Suspense } from "react";

// =============================================================================
// SEO METADATA (§5 of SERVICES_LANDING_PAGE_SPECIFICATION)
// =============================================================================

export const metadata: Metadata = {
  title: "Home Services in Nairobi | Plumbers, Electricians & More | MitaSafi",
  description:
    "Find verified plumbers, electricians, cleaners, movers, and 700+ service providers in Nairobi. Compare quotes, read reviews, book instantly. Trusted by thousands.",
  keywords: [
    "home services Nairobi",
    "plumber Nairobi",
    "electrician Nairobi",
    "house cleaning Nairobi",
    "moving services Kenya",
    "fundi services",
    "verified contractors Kenya",
    "emergency plumber Nairobi",
    "home maintenance Nairobi",
    "service providers Kenya",
    "MitaSafi services",
    "affordable plumber Kenya",
    "cleaning service Westlands",
    "electrician Kilimani",
  ],
  openGraph: {
    title: "Home Services in Nairobi | MitaSafi",
    description:
      "Find verified plumbers, electricians, cleaners, and 700+ service providers in Nairobi. Compare quotes, read reviews, book instantly.",
    type: "website",
    locale: "en_KE",
    url: "https://mitasafi.co.ke/services",
    siteName: "MitaSafi",
    // OG image auto-resolved from opengraph-image.tsx
  },
  twitter: {
    card: "summary_large_image",
    title: "Home Services in Nairobi | MitaSafi",
    description:
      "Verified plumbers, electricians, cleaners & more. Book instantly.",
    // Twitter image auto-resolved from opengraph-image.tsx
    site: "@mitasafi",
  },
  alternates: {
    canonical: "https://mitasafi.co.ke/services",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// =============================================================================
// JSON-LD STRUCTURED DATA
// =============================================================================

const webPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Home Services in Nairobi | MitaSafi",
  url: "https://mitasafi.co.ke/services",
  description:
    "Find verified plumbers, electricians, cleaners, movers, and 700+ service providers in Nairobi. Compare quotes, read reviews, book instantly. Trusted by thousands.",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://mitasafi.co.ke/services/browse?q={search_term}",
    "query-input": "required name=search_term",
  },
};

const professionalServiceJsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "MitaSafi",
  url: "https://mitasafi.co.ke",
  description:
    "Kenya's trusted marketplace for verified home service providers.",
  areaServed: {
    "@type": "City",
    name: "Nairobi",
    containedInPlace: {
      "@type": "Country",
      name: "Kenya",
    },
  },
  serviceType: [
    "Plumbing",
    "Electrical",
    "Cleaning",
    "Moving",
    "Painting",
    "Carpentry",
    "Pest Control",
  ],
};

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function ServicesLandingPage() {
  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webPageJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(professionalServiceJsonLd),
        }}
      />

      {/* Skip-to-content link — keyboard accessible, visible on focus */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-4 focus:left-4 focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:text-gray-900 focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>

      {/* SLP-3: ServicesNavbar (fixed position — renders outside main flow) */}
      <ServicesNavbar />

      <main id="main-content" className="min-h-screen">
        {/* SLP-3 + SLP-4: Hero + Trust Bar */}
        <ServicesHero />
        <ServicesTrustBar />
        <ServicesCategoryGrid />

        {/* SLP-6: How It Works — 3-step process visualization */}
        <ServicesHowItWorks />

        {/* SLP-7: Featured Providers — async server fetch with fallback */}
        <Suspense
          fallback={
            <section className="bg-gray-50 py-16 sm:py-20 lg:py-24" aria-label="Loading featured providers">
              <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <div className="animate-pulse space-y-8">
                  <div className="mx-auto h-8 w-64 rounded bg-gray-200" />
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="bg-white rounded-xl p-6 h-72" />
                    ))}
                  </div>
                </div>
              </div>
            </section>
          }
        >
          <ServicesFeaturedProviders />
        </Suspense>

        {/* SLP-8: Why MitaSafi — 6-pillar value proposition */}
        <ServicesWhyMitaSafi />

        {/* SLP-8: Area Coverage — Nairobi neighborhood chips */}
        <ServicesAreaCoverage />

        {/* SLP-9: Pricing Preview — transparent pricing table */}
        <ServicesPricingPreview />

        {/* SLP-10: Testimonials — tabbed customer + provider stories */}
        <ServicesTestimonials />

        {/* SLP-11: Provider CTA — recruitment banner */}
        <ServicesProviderCTA />

        {/* SLP-12: FAQ — accordion with JSON-LD structured data */}
        <ServicesFAQ />

        {/* SLP-11: Final CTA — bottom conversion section */}
        <ServicesFinalCTA />
      </main>

      <Footer />
    </>
  );
}
