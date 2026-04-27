/**
 * ServicesWhyMitaSafi — 6-Pillar Value Proposition Grid
 *
 * Communicates the six core differentiators that set MitaSafi apart:
 * verified professionals, transparent pricing, secure payments, real reviews,
 * emergency readiness, and neighborhood coverage.
 *
 * Server component — pure static rendering with no client JS.
 *
 * Design:
 * - White background
 * - 3-column grid (desktop), 2-column (tablet), 1-column (mobile)
 * - Each pillar: 16:9 image (rounded-xl) + title + description
 * - Photography only — no Lucide icons. Images communicate the concepts.
 * - Brand teal in eyebrow and title accents
 *
 * @see SERVICES_LANDING_PAGE_SPECIFICATION.md §3 Section 6, SLP-8
 */

import Image from "next/image";
import { Section, SectionHeader } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { SERVICES_IMAGES, type ServicesImageKey } from "./images";

// =============================================================================
// TYPES
// =============================================================================

interface Pillar {
  readonly title: string;
  readonly description: string;
  readonly imageKey: ServicesImageKey;
  readonly imageAlt: string;
}

// =============================================================================
// DATA — THE 6 PILLARS (§3 Section 6)
// =============================================================================

const PILLARS: readonly Pillar[] = [
  {
    title: "Verified Professionals",
    description:
      "Every provider is ID-verified and background-checked before they can accept jobs.",
    imageKey: "whyVerified",
    imageAlt:
      "Close-up of a service provider's ID badge and verification screen on a smartphone",
  },
  {
    title: "Transparent Pricing",
    description:
      "See price ranges before you book. Compare quotes from multiple providers. No surprises.",
    imageKey: "whyPricing",
    imageAlt:
      "Price comparison interface showing quotes from multiple service providers",
  },
  {
    title: "Secure Payments",
    description:
      "Pay through M-Pesa with built-in escrow. Money is released only after you confirm completion.",
    imageKey: "whyPayment",
    imageAlt:
      "Hands holding a phone showing an M-Pesa payment confirmation screen",
  },
  {
    title: "Real Reviews",
    description:
      "Read honest reviews from verified customers. Multi-dimensional ratings cover quality, timeliness, and value.",
    imageKey: "whyReviews",
    imageAlt:
      "Review interface showing star ratings and written customer feedback",
  },
  {
    title: "Emergency Ready",
    description:
      "Burst pipe at midnight? Get a provider within hours, not days. Emergency services available 24/7.",
    imageKey: "whyEmergency",
    imageAlt:
      "Service provider arriving at a customer's door at night for an emergency call",
  },
  {
    title: "Your Neighborhood",
    description:
      "Find providers who already serve your area. Kilimani, Westlands, South B, Karen — all covered.",
    imageKey: "whyNeighborhood",
    imageAlt:
      "Aerial view of Nairobi neighborhoods with service coverage pins on a map",
  },
] as const;

// =============================================================================
// PILLAR CARD
// =============================================================================

function PillarCard({ pillar }: { pillar: Pillar }) {
  return (
    <article className="group">
      {/* Image — 16:9 aspect ratio */}
      <div className="relative aspect-video rounded-xl overflow-hidden mb-5 shadow-soft transition-shadow group-hover:shadow-medium">
        <Image
          src={SERVICES_IMAGES[pillar.imageKey]}
          alt={pillar.imageAlt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          loading="lazy"
        />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {pillar.title}
      </h3>

      {/* Description */}
      <p className="text-base text-gray-600 leading-relaxed">
        {pillar.description}
      </p>
    </article>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ServicesWhyMitaSafi() {
  return (
    <Section background="white" padding="md" id="why-mitasafi">
      <Container size="default">
        <SectionHeader
          eyebrow="The MitaSafi Difference"
          title="Why Nairobi Trusts MitaSafi"
        />

        {/* Pillar Grid */}
        <div className="mt-12 lg:mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {PILLARS.map((pillar) => (
            <PillarCard key={pillar.title} pillar={pillar} />
          ))}
        </div>
      </Container>
    </Section>
  );
}
