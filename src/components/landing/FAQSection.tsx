"use client";

import { useState } from "react";
import { Section, SectionHeader, Container } from "@/components/ui";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "Is MitaSafi really free for tenants?",
    answer:
      "Yes! MitaSafi is completely free for tenants. You can search unlimited properties, message landlords directly, pay rent securely, and access all features without paying anything. We make money from landlord subscriptions and service provider fees, not from tenants.",
  },
  {
    question: "How do you verify listings?",
    answer:
      "Every listing goes through our verification process. We confirm property ownership documents, require timestamped photos (no stock photos allowed), verify that stated amenities exist, and conduct random spot checks. Listings that don't match reality get removed, and repeat offenders are banned.",
  },
  {
    question: "How do rent payments work?",
    answer:
      "You can pay rent directly through the app using M-Pesa or bank transfer. The money goes straight to your landlord's account (not ours), and you get an instant digital receipt. This creates an undisputable payment history that protects you in case of any disputes.",
  },
  {
    question: "What if something breaks in my rental?",
    answer:
      "Report it through the app with photos and a description. Your landlord gets notified immediately and can either handle it themselves or assign a verified service provider from our network. You can track the status in real-time and escalate if nothing happens.",
  },
  {
    question: "How long does it take to find a home?",
    answer:
      "Most tenants find their home within 7-14 days. With virtual tours and direct landlord messaging, you can shortlist properties without wasting weekends on viewings. When you're ready, the digital application and lease signing make moving in fast.",
  },
  {
    question: "Can I list my property if I only have one unit?",
    answer:
      "Absolutely! Our Free plan supports landlords with up to 3 units. You get all the essential features including listings, tenant messaging, payment tracking, and maintenance requests. Upgrade to Professional when you grow.",
  },
  {
    question: "What areas of Nairobi do you cover?",
    answer:
      "We cover all of Nairobi and surrounding areas including Kilimani, Westlands, Karen, Langata, South B/C, Lavington, Parklands, Ngong Road, Upper Hill, Kileleshwa, Hurlingham, Riverside, and many more. We're expanding to other Kenyan cities soon.",
  },
  {
    question: "How do I become a verified service provider?",
    answer:
      "Apply through our Service Provider portal with your ID, business registration (if applicable), and proof of skills/certifications. We verify your credentials and conduct a brief interview. Once approved, you'll start receiving job requests from landlords and tenants in your area.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <Section background="gray" id="faq">
      <Container size="narrow">
        <SectionHeader
          eyebrow="FAQ"
          title="Frequently Asked Questions"
          description="Got questions? We've got answers."
        />

        {/* FAQ Accordion */}
        <div className="mt-12 space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-xl border border-gray-100 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-900 pr-4">
                  {faq.question}
                </span>
                <ChevronDown
                  className={cn(
                    "w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200",
                    openIndex === index && "rotate-180"
                  )}
                />
              </button>
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300",
                  openIndex === index ? "max-h-96" : "max-h-0"
                )}
              >
                <p className="px-6 pb-6 text-gray-600 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Still have questions */}
        <div className="mt-12 text-center">
          <p className="text-gray-600 mb-2">Still have questions?</p>
          <a
            href="mailto:support@mitasafi.co.ke"
            className="text-brand-600 font-semibold hover:text-brand-700 transition-colors"
          >
            Contact our support team →
          </a>
        </div>
      </Container>
    </Section>
  );
}
