/**
 * ServicesProviderCTA — Provider Recruitment Banner
 *
 * A mini-landing section within the services page that recruits
 * service providers. Features a provider photo, benefits list,
 * and dual CTAs (join + learn more).
 *
 * Server component — pure static rendering with no client JS.
 *
 * Design:
 * - Brand teal gradient background (brand-700 → brand-600 → brand-500)
 * - Two-column layout: provider photo (left) + copy/CTAs (right)
 * - Benefits use ✓ text character — NOT Lucide icons
 * - Mobile: photo stacks on top, text below
 *
 * @see SERVICES_LANDING_PAGE_SPECIFICATION.md §3 Section 10, SLP-11
 */

import Image from "next/image";
import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { SERVICES_IMAGES } from "./images";

// =============================================================================
// BENEFITS DATA
// =============================================================================

const PROVIDER_BENEFITS = [
  "Free to join",
  "Set your own rates",
  "Secure payments via M-Pesa",
  "Build your reputation with verified reviews",
] as const;

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ServicesProviderCTA() {
  return (
    <Section
      background="brand"
      padding="md"
      className="bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500"
      id="provider-cta"
    >
      <Container size="default">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Provider Photo */}
          <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl lg:mx-0">
            <Image
              src={SERVICES_IMAGES.providerCta}
              alt="Confident African service provider in professional attire"
              fill
              sizes="(max-width: 1024px) 384px, 50vw"
              className="object-cover"
              loading="lazy"
            />
          </div>

          {/* Copy + CTAs */}
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Are You a Service Provider?
            </h2>
            <p className="mt-4 text-xl text-white/80">
              Join Kenya&apos;s fastest-growing home services marketplace.
            </p>

            {/* Benefits List */}
            <ul className="mt-8 space-y-3">
              {PROVIDER_BENEFITS.map((benefit) => (
                <li
                  key={benefit}
                  className="flex items-center gap-3 text-lg text-white lg:justify-start justify-center"
                >
                  <span className="text-white/90 font-bold" aria-hidden="true">
                    ✓
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>

            {/* CTAs */}
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href="/signup?role=provider"
                className={cn(buttonVariants({ variant: "primary", size: "lg" }))}
              >
                Join as Provider →
              </Link>
              <Link
                href="/service-providers"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" })
                )}
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
