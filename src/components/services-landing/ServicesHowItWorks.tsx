/**
 * ServicesHowItWorks — 3-Step Process Visualization
 *
 * Explains MitaSafi's booking flow in 3 clear steps with photography,
 * step watermarks, and connectors. Reduces user anxiety and communicates
 * simplicity.
 *
 * Server component — pure static rendering with no client JS.
 *
 * Design:
 * - Desktop: 3-column grid with dashed SVG connectors between cards
 * - Mobile: Vertical timeline with numbered circles and dashed connector line
 * - Step numbers render as large watermark behind each card (brand-100)
 * - Images sourced from `images.ts` (Supabase storage) — never inline URLs
 * - Teal + orange brand accents: step numbers in brand-100, CTA in brand variant
 *
 * @see SERVICES_LANDING_PAGE_SPECIFICATION.md §3 Section 4, SLP-6
 */

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

interface Step {
  readonly number: number;
  readonly title: string;
  readonly description: string;
  readonly imageKey: ServicesImageKey;
  readonly imageAlt: string;
}

// =============================================================================
// DATA — THE 3 STEPS (§3 Section 4)
// =============================================================================

const STEPS: readonly Step[] = [
  {
    number: 1,
    title: "Search & Discover",
    description:
      "Find the right service provider by category, area, or keyword. Compare profiles, ratings, and prices.",
    imageKey: "howitSearch",
    imageAlt:
      "Close-up of hands searching for a service provider on a smartphone using the MitaSafi app",
  },
  {
    number: 2,
    title: "Compare & Choose",
    description:
      "Read verified reviews, compare quotes from multiple providers, and pick the best match for your needs and budget.",
    imageKey: "howitCompare",
    imageAlt:
      "Split view showing two provider profiles side by side with star ratings and price ranges",
  },
  {
    number: 3,
    title: "Book & Pay Securely",
    description:
      "Confirm your booking, pay via M-Pesa with escrow protection, and get the job done right.",
    imageKey: "howitBook",
    imageAlt:
      "Customer greeting a professional service provider at their door in Nairobi",
  },
] as const;

// =============================================================================
// DESKTOP CONNECTOR (dashed arrow between steps)
// =============================================================================

function StepConnector() {
  return (
    <div
      className="hidden lg:flex items-center justify-center absolute top-1/3 -right-6 xl:-right-8 z-10"
      aria-hidden="true"
    >
      <svg
        width="48"
        height="24"
        viewBox="0 0 48 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-cta-300"
      >
        <line
          x1="0"
          y1="12"
          x2="36"
          y2="12"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="6 4"
        />
        <path
          d="M36 6 L46 12 L36 18"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// =============================================================================
// STEP CARD
// =============================================================================

function StepCard({ step, isLast }: { step: Step; isLast: boolean }) {
  return (
    <div className="relative">
      {/* ── Mobile: Timeline Circle + Vertical Connector ──────── */}
      <div className="lg:hidden flex items-start gap-4 mb-4">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-cta-500 text-white flex items-center justify-center text-lg font-bold shrink-0">
            {step.number}
          </div>
          {!isLast && (
            <div
              className="w-0.5 h-full min-h-[16px] border-l-2 border-dashed border-cta-200 mt-2"
              aria-hidden="true"
            />
          )}
        </div>
        <div className="pt-1.5">
          <h3 className="text-xl font-semibold text-gray-900">
            {step.title}
          </h3>
        </div>
      </div>

      {/* ── Card Body ────────────────────────────────────────── */}
      <div className="relative lg:pl-0 pl-14">
        {/* Desktop: Step Number Watermark */}
        <span
          className="hidden lg:block absolute -top-4 -left-2 text-7xl font-bold text-cta-100 select-none pointer-events-none z-0"
          aria-hidden="true"
        >
          {step.number}
        </span>

        {/* Image */}
        <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-5 shadow-soft">
          <Image
            src={SERVICES_IMAGES[step.imageKey]}
            alt={step.imageAlt}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
            loading="lazy"
          />
        </div>

        {/* Desktop: Title (mobile title is above in timeline) */}
        <h3 className="hidden lg:block text-xl font-semibold text-gray-900 mb-2 relative z-[1]">
          {step.title}
        </h3>

        {/* Description */}
        <p className="text-base text-gray-600 leading-relaxed relative z-[1]">
          {step.description}
        </p>
      </div>

      {/* ── Desktop: Dashed Connector Arrow ──────────────────── */}
      {!isLast && <StepConnector />}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ServicesHowItWorks() {
  return (
    <Section background="white" padding="md" id="how-it-works">
      <Container size="default">
        <SectionHeader
          eyebrow="Simple Process"
          title="How It Works"
          description="Get professional help in 3 simple steps"
          eyebrowColor="cta"
        />

        {/* Step Grid */}
        <div className="mt-12 lg:mt-16 grid lg:grid-cols-3 gap-10 lg:gap-12">
          {STEPS.map((step, index) => (
            <StepCard
              key={step.number}
              step={step}
              isLast={index === STEPS.length - 1}
            />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 lg:mt-16 text-center">
          <Link
            href="/services/browse"
            className={cn(
              buttonVariants({ variant: "primary", size: "lg" }),
              "group"
            )}
          >
            Find a Provider
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
