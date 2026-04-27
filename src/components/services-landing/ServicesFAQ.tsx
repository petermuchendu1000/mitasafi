/**
 * ServicesFAQ — Accordion FAQ with JSON-LD Structured Data
 *
 * Displays 8 frequently asked questions in an independently-togglable
 * accordion. Injects FAQPage JSON-LD structured data for Google
 * rich snippet eligibility.
 *
 * Client component — requires state for accordion open/close toggling.
 *
 * Accessibility:
 * - Each question is a `<button>` with `aria-expanded` and `aria-controls`
 * - Each answer panel has a unique `id` matching the button's `aria-controls`
 * - `+`/`−` text indicators (NOT Lucide icons) toggle with state
 * - Multiple items can be open simultaneously (independent toggles)
 * - Smooth expand/collapse via CSS grid-rows animation
 *
 * @see SERVICES_LANDING_PAGE_SPECIFICATION.md §3 Section 11, SLP-12
 */

"use client";

import { useCallback, useState } from "react";
import { Section, SectionHeader } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

interface FAQItem {
  readonly question: string;
  readonly answer: string;
}

// =============================================================================
// DATA — 8 FAQ ITEMS (§3 Section 11)
// =============================================================================

const FAQ_DATA: readonly FAQItem[] = [
  {
    question: "How do I find a service provider?",
    answer:
      "Search by service type or browse categories. Filter by area, price, and rating. Read reviews from verified customers before booking.",
  },
  {
    question: "How much do services cost?",
    answer:
      "Prices vary by service type, scope, and provider. You can see price ranges on each provider's profile and request free quotes before committing.",
  },
  {
    question: "Are providers verified?",
    answer:
      "Yes. Every provider completes ID verification and phone verification. Certified providers undergo additional background checks. Look for the verified badge on profiles.",
  },
  {
    question: "How do payments work?",
    answer:
      "Payments are processed securely through M-Pesa. For larger jobs, funds are held in escrow and released to the provider only after you confirm the work is complete.",
  },
  {
    question: "What if I'm not satisfied?",
    answer:
      "You can raise a dispute through the platform within 48 hours of job completion. Our team reviews the case and mediates a fair resolution.",
  },
  {
    question: "Can I book emergency services?",
    answer:
      'Yes. Filter by "Available Now" to find providers who can respond immediately. Emergency plumbing and electrical providers are typically available within 2–4 hours.',
  },
  {
    question: "How do I become a service provider?",
    answer:
      "Sign up for free at mitasafi.co.ke/signup. Complete your profile, verify your identity, add your services, and start receiving job requests.",
  },
  {
    question: "Is there a fee to join as a provider?",
    answer:
      "Joining is completely free. We charge a small service fee (10–15%) only when you successfully complete a job and receive payment.",
  },
] as const;

// =============================================================================
// JSON-LD — FAQPage Structured Data
// =============================================================================

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_DATA.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

// =============================================================================
// ACCORDION ITEM
// =============================================================================

function AccordionItem({
  item,
  index,
  isOpen,
  onToggle,
}: {
  item: FAQItem;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const buttonId = `faq-question-${index}`;
  const panelId = `faq-answer-${index}`;

  return (
    <div className="border-b border-gray-100">
      <h3>
        <button
          id={buttonId}
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 rounded"
        >
          <span className="text-lg font-medium text-gray-900 flex-1">
            {item.question}
          </span>
          <span
            className={cn(
              "shrink-0 text-xl font-light text-gray-400 transition-transform duration-200",
              isOpen && "text-cta-600"
            )}
            aria-hidden="true"
          >
            {isOpen ? "−" : "+"}
          </span>
        </button>
      </h3>

      {/* Answer Panel — animated with CSS grid-rows */}
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-in-out",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <p className="pb-5 text-base text-gray-600 leading-relaxed">
            {item.answer}
          </p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ServicesFAQ() {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  const toggleItem = useCallback((index: number) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  return (
    <Section background="white" padding="md" id="faq">
      {/* JSON-LD Structured Data for rich snippets */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <Container size="default">
        <SectionHeader
          eyebrow="FAQ"
          title="Frequently Asked Questions"
        />

        {/* Accordion */}
        <div className="mx-auto mt-12 max-w-3xl">
          {FAQ_DATA.map((item, index) => (
            <AccordionItem
              key={index}
              item={item}
              index={index}
              isOpen={openItems.has(index)}
              onToggle={() => toggleItem(index)}
            />
          ))}
        </div>
      </Container>
    </Section>
  );
}
