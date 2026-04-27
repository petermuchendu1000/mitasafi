/**
 * ServicesFinalCTA — Bottom Conversion Section
 *
 * Last-chance dual-path CTA: one path for customers ("Find a Provider")
 * and one for service providers ("Join as Provider"). Includes a login
 * link for returning users.
 *
 * Server component — pure static rendering with no client JS.
 *
 * Design:
 * - CTA orange gradient background (cta-700 → cta-600)
 * - Centered headline + two side-by-side buttons
 * - Login text link below buttons
 * - Mobile: buttons stack vertically
 *
 * @see SERVICES_LANDING_PAGE_SPECIFICATION.md §3 Section 12, SLP-11
 */

import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ServicesFinalCTA() {
  return (
    <Section
      background="brand"
      padding="lg"
      className="bg-gradient-to-br from-cta-700 to-cta-600"
    >
      <Container size="narrow">
        <div className="text-center">
          {/* Headline */}
          <h2 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl tracking-tight text-balance">
            Ready to Get Started?
          </h2>

          {/* Dual CTAs */}
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/services/browse"
              className={cn(buttonVariants({ variant: "white", size: "lg" }))}
            >
              Find a Provider
            </Link>
            <Link
              href="/signup?role=provider"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              Join as Provider
            </Link>
          </div>

          {/* Login Link */}
          <p className="mt-8 text-sm text-white/70">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-white hover:underline underline-offset-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-cta-700 rounded"
            >
              Log in →
            </Link>
          </p>
        </div>
      </Container>
    </Section>
  );
}
