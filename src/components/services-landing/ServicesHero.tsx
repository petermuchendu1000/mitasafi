/**
 * ServicesHero — Full-bleed Hero Section with Search
 *
 * First impression section: value proposition headline, background image,
 * search bar (client island), and popular category tags.
 *
 * Server component — the search bar is a self-contained client island
 * wrapped in Suspense for streaming compatibility.
 *
 * @see SERVICES_LANDING_PAGE_SPECIFICATION.md §3 Section 1
 */

import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { ServiceSearchAutocomplete } from "@/components/services/ServiceSearchAutocomplete";
import { SERVICES_IMAGES, SERVICES_BLUR_DATA } from "./images";

// =============================================================================
// POPULAR TAGS
// =============================================================================

const POPULAR_TAGS = [
  { label: "Plumbing", href: "/services/browse?category=plumbing" },
  { label: "Cleaning", href: "/services/browse?category=cleaning" },
  { label: "Electrical", href: "/services/browse?category=electrical" },
  { label: "Moving", href: "/services/browse?category=moving-relocation" },
  { label: "Painting", href: "/services/browse?category=painting" },
  { label: "Laundry", href: "/services/browse?category=laundry" },
] as const;

// =============================================================================
// COMPONENT
// =============================================================================

export function ServicesHero() {
  return (
    <section
      className="relative min-h-[600px] lg:min-h-[700px] flex items-center overflow-hidden"
      aria-labelledby="services-hero-heading"
    >
      {/* ── Background Image ──────────────────────────────────────── */}
      <Image
        src={SERVICES_IMAGES.servicesHeroBg}
        alt="Professional plumber working under a modern kitchen sink in Nairobi"
        fill
        priority
        quality={75}
        sizes="100vw"
        className="object-cover object-center"
        placeholder="blur"
        blurDataURL={SERVICES_BLUR_DATA.servicesHeroBg}
      />

      {/* ── Dark Overlays for Text Readability ────────────────────── */}
      <div className="absolute inset-0 bg-gray-900/60" aria-hidden="true" />
      <div
        className="absolute inset-0 bg-gradient-to-t from-gray-900/40 via-transparent to-gray-900/20"
        aria-hidden="true"
      />

      {/* ── Content ───────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        {/* ── Headline + Subheadline ────────────────────────────── */}
        <div className="max-w-3xl mx-auto text-center mb-10 lg:mb-12">
          <h1
            id="services-hero-heading"
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight"
          >
            Trusted Home Services
            <br />
            Across Nairobi
          </h1>
          <p className="mt-4 sm:mt-6 text-xl sm:text-2xl text-white/80 leading-relaxed">
            Verified professionals. Transparent pricing.
            <br className="hidden sm:inline" />
            {" "}Book in minutes, not days.
          </p>
        </div>

        {/* ── Search Bar (Client Island) ────────────────────────── */}
        <div className="max-w-2xl mx-auto mb-8">
          <Suspense
            fallback={
              <div
                className="h-14 bg-white/10 rounded-2xl animate-pulse"
                aria-label="Loading search..."
              />
            }
          >
            <ServiceSearchAutocomplete
              variant="hero"
              placeholder="What service do you need? (e.g., Fix a leaking tap)"
              showPopularOnFocus
            />
          </Suspense>
        </div>

        {/* ── Popular Tags ──────────────────────────────────────── */}
        <nav aria-label="Popular service categories" className="flex items-center justify-center gap-2 flex-wrap">
          <span className="text-sm text-white/60 font-medium mr-1">
            Popular:
          </span>
          {POPULAR_TAGS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-4 py-2 rounded-full backdrop-blur-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
