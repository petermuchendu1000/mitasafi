/**
 * ServicesCategoryGrid — Visual Category Navigation
 *
 * 12-card photo grid showing the primary service categories.
 * Each card is a deep-link into the marketplace filtered by category.
 * The 12th card ("More Services") opens a dropdown of 9 additional categories.
 *
 * Client component: needs state for "More" dropdown and mobile "Show more".
 *
 * Architecture notes:
 * - Images are imported from the single-source `images.ts` (never inline URLs)
 * - Category slugs match the canonical DB slugs from §9 of the spec
 * - Provider counts are placeholder (will be API-driven once DB is populated)
 * - All cards use Next.js `<Image>` with lazy loading (below the fold)
 * - Zero Lucide/decorative icons — photography only
 *
 * @see SERVICES_LANDING_PAGE_SPECIFICATION.md §3 Section 3, §9
 */

"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Section, SectionHeader } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { SERVICES_IMAGES, type ServicesImageKey } from "./images";

// =============================================================================
// TYPES
// =============================================================================

interface CategoryItem {
  name: string;
  slug: string;
  imageKey: ServicesImageKey;
  providerCount: string;
}

interface ExtendedCategoryItem {
  name: string;
  slug: string;
}

// =============================================================================
// DATA — CANONICAL CATEGORIES (§9)
// =============================================================================

/**
 * Primary 11 categories displayed as photo cards on the grid.
 * Order matches §9 canonical reference. Provider counts are
 * aspirational placeholders — will be replaced with live aggregate
 * queries once the `service_providers` table is populated.
 */
const PRIMARY_CATEGORIES: CategoryItem[] = [
  { name: "Plumbing", slug: "plumbing", imageKey: "catPlumbing", providerCount: "12 providers" },
  { name: "Electrical", slug: "electrical", imageKey: "catElectrical", providerCount: "8 providers" },
  { name: "Water & Gas Delivery", slug: "water-gas-delivery", imageKey: "catWaterGas", providerCount: "3 providers" },
  { name: "Cleaning", slug: "cleaning", imageKey: "catCleaning", providerCount: "24 providers" },
  { name: "Laundry", slug: "laundry", imageKey: "catLaundry", providerCount: "6 providers" },
  { name: "Pest Control", slug: "pest-control", imageKey: "catPestControl", providerCount: "5 providers" },
  { name: "Carpentry", slug: "carpentry", imageKey: "catCarpentry", providerCount: "7 providers" },
  { name: "Painting", slug: "painting", imageKey: "catPainting", providerCount: "10 providers" },
  { name: "Moving & Relocation", slug: "moving-relocation", imageKey: "catMoving", providerCount: "15 providers" },
  { name: "Internet & Networking", slug: "internet-networking", imageKey: "catInternet", providerCount: "4 providers" },
  { name: "Gardening & Landscaping", slug: "gardening-landscaping", imageKey: "catGardening", providerCount: "6 providers" },
];

/**
 * The 9 extended categories behind the "More" trigger.
 * Order matches §9 (101-109). No images — listed as text links.
 */
const EXTENDED_CATEGORIES: ExtendedCategoryItem[] = [
  { name: "Garbage & Junk Removal", slug: "garbage-junk-removal" },
  { name: "IT & Tech Support", slug: "it-tech-support" },
  { name: "Welding & Metal Works", slug: "welding-metal-works" },
  { name: "Glass & Aluminium Works", slug: "glass-aluminium-works" },
  { name: "Beauty (Home Services)", slug: "beauty-home-services" },
  { name: "Events & Planning", slug: "events-planning" },
  { name: "Childcare & Home Care", slug: "childcare-home-care" },
  { name: "Taxi & Rides", slug: "taxi-rides" },
  { name: "Shopping Assistance", slug: "shopping-assistance" },
];

/** Number of cards visible by default on mobile (< sm breakpoint) */
const MOBILE_INITIAL_COUNT = 8;

// =============================================================================
// CATEGORY CARD COMPONENT
// =============================================================================

function CategoryCard({ category }: { category: CategoryItem }) {
  return (
    <Link
      href={`/services/browse?category=${category.slug}`}
      className="group relative block aspect-[4/3] rounded-xl overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
    >
      <Image
        src={SERVICES_IMAGES[category.imageKey]}
        alt={`${category.name} services in Nairobi`}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        loading="lazy"
      />
      {/* Dark gradient overlay — heavier at bottom for text readability */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/20 to-transparent"
        aria-hidden="true"
      />
      {/* Text overlay */}
      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
        <h3 className="text-sm sm:text-base font-semibold text-white leading-tight">
          {category.name}
        </h3>
        <p className="text-xs sm:text-sm text-white/70 mt-0.5">
          {category.providerCount}
        </p>
      </div>
      {/* Hover shadow boost */}
      <div
        className="absolute inset-0 rounded-xl ring-1 ring-inset ring-black/10 transition-shadow duration-300 group-hover:shadow-medium"
        aria-hidden="true"
      />
    </Link>
  );
}

// =============================================================================
// "MORE" CARD COMPONENT
// =============================================================================

function MoreCategoriesCard({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        cardRef.current &&
        !cardRef.current.contains(event.target as Node)
      ) {
        onToggle();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onToggle]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onToggle();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onToggle]);

  return (
    <div ref={cardRef} className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="group relative block w-full aspect-[4/3] rounded-xl overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      >
        <Image
          src={SERVICES_IMAGES.catMore}
          alt="Browse more service categories"
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          loading="lazy"
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/20 to-transparent"
          aria-hidden="true"
        />
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
          <p className="text-sm sm:text-base font-semibold text-white leading-tight">
            More Services
          </p>
          <p className="text-xs sm:text-sm text-white/70 mt-0.5">
            +{EXTENDED_CATEGORIES.length} categories
          </p>
        </div>
        <div
          className="absolute inset-0 rounded-xl ring-1 ring-inset ring-black/10 transition-shadow duration-300 group-hover:shadow-medium"
          aria-hidden="true"
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-40 top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-strong border border-gray-200 overflow-hidden"
          role="menu"
        >
          <div className="py-1">
            {EXTENDED_CATEGORIES.map(({ name, slug }) => (
              <Link
                key={slug}
                href={`/services/browse?category=${slug}`}
                role="menuitem"
                className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-brand-600 transition-colors focus-visible:outline-none focus-visible:bg-brand-50 focus-visible:text-brand-700"
              >
                {name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ServicesCategoryGrid() {
  const [showAllMobile, setShowAllMobile] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);

  return (
    <Section background="gray" padding="md">
      <Container>
        {/* ── Section Header ──────────────────────────────────────── */}
        <SectionHeader
          eyebrow="Services"
          title="What Do You Need Help With?"
          description="Browse our most popular service categories or search for exactly what you need."
        />

        {/* ── Category Grid ───────────────────────────────────────── */}
        <div className="mt-10 lg:mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
          {PRIMARY_CATEGORIES.map((category, index) => (
            <div
              key={category.slug}
              className={cn(
                // On mobile (< sm): hide cards beyond the initial count
                // unless user has toggled "Show more"
                index >= MOBILE_INITIAL_COUNT && !showAllMobile && "hidden sm:block"
              )}
            >
              <CategoryCard category={category} />
            </div>
          ))}

          {/* "More" card — always visible on sm+, hidden on mobile
              until showAllMobile is true (it's the 12th card) */}
          <div
            className={cn(
              PRIMARY_CATEGORIES.length >= MOBILE_INITIAL_COUNT &&
                !showAllMobile &&
                "hidden sm:block"
            )}
          >
            <MoreCategoriesCard
              isOpen={moreDropdownOpen}
              onToggle={() => setMoreDropdownOpen((prev) => !prev)}
            />
          </div>
        </div>

        {/* ── Mobile "Show More" Toggle ───────────────────────────── */}
        {!showAllMobile && (
          <div className="mt-4 text-center sm:hidden">
            <button
              type="button"
              onClick={() => setShowAllMobile(true)}
              className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors px-4 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-lg"
            >
              Show {PRIMARY_CATEGORIES.length - MOBILE_INITIAL_COUNT + 1} more categories
            </button>
          </div>
        )}

        {/* ── Bottom CTA ──────────────────────────────────────────── */}
        <div className="mt-10 lg:mt-12 text-center">
          <Link
            href="/services/browse"
            className={cn(
              buttonVariants({ variant: "secondary", size: "lg" }),
              "inline-flex"
            )}
          >
            Browse All Services
            <span className="ml-1" aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </Container>
    </Section>
  );
}
