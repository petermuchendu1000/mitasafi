/**
 * ServicesTestimonials — Tabbed Customer & Provider Testimonials
 *
 * Displays social proof from both customers and service providers using
 * an accessible tabbed interface. Defaults to the "From Customers" tab.
 *
 * Client component — requires state for tab switching.
 *
 * Accessibility:
 * - `role="tablist"` on tab container
 * - `role="tab"` + `aria-selected` on each tab button
 * - `role="tabpanel"` + `aria-labelledby` on each panel
 * - Arrow key navigation between tabs (Left/Right)
 * - Enter/Space to activate a tab
 *
 * Design:
 * - Gray background (bg-gray-50)
 * - Tab strip with brand underline on active tab
 * - 2-column card grid (desktop), single column (mobile)
 * - Quote text in italic, followed by avatar + name + area + rating
 * - Star ratings as text characters (★), not Lucide icons
 *
 * @see SERVICES_LANDING_PAGE_SPECIFICATION.md §3 Section 9, SLP-10
 */

"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { Section, SectionHeader } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/utils";
import { SERVICES_IMAGES, type ServicesImageKey } from "./images";

// =============================================================================
// TYPES
// =============================================================================

interface Testimonial {
  readonly name: string;
  readonly area: string;
  readonly service: string;
  readonly quote: string;
  readonly rating: number;
  readonly avatarKey: ServicesImageKey;
}

type TabId = "customers" | "providers";

interface Tab {
  readonly id: TabId;
  readonly label: string;
}

// =============================================================================
// TABS
// =============================================================================

const TABS: readonly Tab[] = [
  { id: "customers", label: "From Customers" },
  { id: "providers", label: "From Providers" },
] as const;

// =============================================================================
// DATA — CUSTOMER TESTIMONIALS (§3 Section 9)
// =============================================================================

const CUSTOMER_TESTIMONIALS: readonly Testimonial[] = [
  {
    name: "Grace M.",
    area: "Kilimani",
    service: "Plumbing",
    quote:
      "Found an amazing plumber in 20 minutes. Professional, on time, and fair price. No more asking neighbors for recommendations.",
    rating: 5,
    avatarKey: "avatarGrace",
  },
  {
    name: "David O.",
    area: "Westlands",
    service: "Cleaning",
    quote:
      "We've been using the same cleaner we found on MitaSafi for 6 months now. The booking system makes scheduling a breeze.",
    rating: 5,
    avatarKey: "avatarDavid",
  },
  {
    name: "Wanjiku K.",
    area: "South B",
    service: "Electrical",
    quote:
      "Our fridge stopped working on a Saturday night. Had an electrician at our door by Sunday morning. Lifesaver.",
    rating: 5,
    avatarKey: "avatarWanjiku",
  },
  {
    name: "James N.",
    area: "Karen",
    service: "Moving",
    quote:
      "Moved our entire 3-bedroom house in one day. The movers were careful with our things and everything arrived intact.",
    rating: 5,
    avatarKey: "avatarJames",
  },
  {
    name: "Aisha M.",
    area: "Langata",
    service: "Painting",
    quote:
      "Got three quotes within an hour. Compared reviews and picked the best one. The result was better than expected.",
    rating: 5,
    avatarKey: "avatarAisha",
  },
  {
    name: "Brian W.",
    area: "Parklands",
    service: "Pest Control",
    quote:
      "Cockroach problem gone in one treatment. The provider even gave us prevention tips for free.",
    rating: 5,
    avatarKey: "avatarBrian",
  },
] as const;

// =============================================================================
// DATA — PROVIDER TESTIMONIALS (§3 Section 9)
// =============================================================================

const PROVIDER_TESTIMONIALS: readonly Testimonial[] = [
  {
    name: "Peter K.",
    area: "Nairobi",
    service: "Plumber",
    quote:
      "MitaSafi gives me steady work every week. I used to spend half my time looking for jobs — now they come to me.",
    rating: 5,
    avatarKey: "avatarPeter",
  },
  {
    name: "Mary W.",
    area: "Nairobi",
    service: "Cleaner",
    quote:
      "The secure payment system means I always get paid. No more chasing clients for money.",
    rating: 5,
    avatarKey: "avatarMary",
  },
  {
    name: "Samuel O.",
    area: "Nairobi",
    service: "Electrician",
    quote:
      "My reviews on MitaSafi helped me raise my rates by 40%. Clients trust me because they can see my track record.",
    rating: 5,
    avatarKey: "avatarSamuel",
  },
  {
    name: "Hannah N.",
    area: "Nairobi",
    service: "Interior Designer",
    quote:
      "The platform handles scheduling and payments so I can focus on what I do best — making homes beautiful.",
    rating: 5,
    avatarKey: "avatarHannah",
  },
] as const;

const TESTIMONIAL_MAP: Record<TabId, readonly Testimonial[]> = {
  customers: CUSTOMER_TESTIMONIALS,
  providers: PROVIDER_TESTIMONIALS,
};

// =============================================================================
// STAR RATING (text characters — NOT icons)
// =============================================================================

function StarRating({ rating }: { rating: number }) {
  const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
  return (
    <span className="text-cta-400 text-sm" aria-label={`${rating} out of 5 stars`}>
      {stars}
    </span>
  );
}

// =============================================================================
// TESTIMONIAL CARD
// =============================================================================

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <blockquote className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      {/* Quote */}
      <p className="text-lg italic text-gray-700 leading-relaxed">
        &ldquo;{testimonial.quote}&rdquo;
      </p>

      {/* Attribution */}
      <footer className="mt-5 flex items-center gap-3">
        {/* Avatar */}
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full">
          <Image
            src={SERVICES_IMAGES[testimonial.avatarKey]}
            alt={`Photo of ${testimonial.name}`}
            fill
            sizes="48px"
            className="object-cover"
            loading="lazy"
          />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {testimonial.name}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {testimonial.area} · {testimonial.service}
          </p>
          <StarRating rating={testimonial.rating} />
        </div>
      </footer>
    </blockquote>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ServicesTestimonials() {
  const [activeTab, setActiveTab] = useState<TabId>("customers");
  const tabListRef = useRef<HTMLDivElement>(null);

  /**
   * Handle keyboard navigation between tabs.
   * Left/Right arrows move focus and activate the adjacent tab.
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const tabButtons = tabListRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]'
      );
      if (!tabButtons || tabButtons.length === 0) return;

      const currentIndex = TABS.findIndex((t) => t.id === activeTab);
      let nextIndex: number | null = null;

      if (e.key === "ArrowRight") {
        nextIndex = (currentIndex + 1) % TABS.length;
      } else if (e.key === "ArrowLeft") {
        nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
      } else if (e.key === "Home") {
        nextIndex = 0;
      } else if (e.key === "End") {
        nextIndex = TABS.length - 1;
      }

      if (nextIndex !== null) {
        e.preventDefault();
        const nextTab = TABS[nextIndex];
        setActiveTab(nextTab.id);
        tabButtons[nextIndex].focus();
      }
    },
    [activeTab]
  );

  const testimonials = TESTIMONIAL_MAP[activeTab];

  return (
    <Section background="gray" padding="md" id="testimonials">
      <Container size="default">
        <SectionHeader
          eyebrow="Testimonials"
          title="What People Are Saying"
        />

        {/* Tab Strip */}
        <div className="mt-10 flex justify-center">
          <div
            ref={tabListRef}
            role="tablist"
            aria-label="Testimonial categories"
            onKeyDown={handleKeyDown}
            className="inline-flex gap-1 rounded-lg bg-gray-200/60 p-1"
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={isActive}
                  aria-controls={`tabpanel-${tab.id}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "rounded-md px-5 py-2.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
                    isActive
                      ? "bg-white text-brand-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Panel */}
        <div
          role="tabpanel"
          id={`tabpanel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          tabIndex={0}
          className="mt-8 lg:mt-10"
        >
          <div className="grid gap-6 sm:grid-cols-2">
            {testimonials.map((t) => (
              <TestimonialCard key={t.name} testimonial={t} />
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
