import Link from "next/link";
import { Navbar, Footer } from "@/components/landing";
import { Container } from "@/components/ui";
import { LEGAL_LAST_UPDATED } from "@/lib/site/legal";

/**
 * Shared shell for the long-form legal and guide pages, so /terms, /privacy
 * and the guides share one layout instead of three near-copies.
 */
export function LegalPage({
  title,
  intro,
  showUpdated = true,
  children,
}: {
  title: string;
  intro: string;
  showUpdated?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main>
        {/* pt clears the fixed Navbar (Navbar.tsx:79, h-16 lg:h-20). Every other
            content page uses pt-32 lg:pt-40; py-14 left the heading clipped. */}
        <section className="bg-brand-700 pt-32 pb-14 lg:pt-40 lg:pb-20">
          <Container>
            <h1 className="text-3xl lg:text-5xl font-bold text-white">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-white/80">{intro}</p>
            {showUpdated && (
              <p className="mt-6 text-sm text-white/60">
                Last updated {LEGAL_LAST_UPDATED}
              </p>
            )}
          </Container>
        </section>

        <section className="py-12 lg:py-16">
          <Container>
            <div className="max-w-3xl space-y-10 text-gray-700 leading-relaxed">
              {children}
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}

/** One numbered section of a legal document. */
export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-xl lg:text-2xl font-bold text-gray-900">{heading}</h2>
      {children}
    </div>
  );
}

/** A cross-reference to another page, styled consistently. */
export function LegalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="text-brand-600 underline hover:text-brand-700">
      {children}
    </Link>
  );
}
