import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { LandlordDropdown } from "@/components/landing/LandlordDropdown";

export function CTASection() {
  return (
    <section className="relative overflow-hidden py-20 lg:py-28">
      {/* Background */}
      <div className="absolute inset-0 bg-brand-600">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500" />
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
      </div>

      <Container className="relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div className="text-white text-center lg:text-left">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-6">
              Ready to Find Your Next Home?
            </h2>
            <p className="text-xl text-white/80 mb-8 max-w-lg mx-auto lg:mx-0">
              Join thousands of Nairobi renters who&apos;ve stopped gambling and
              started living. Your perfect home is waiting.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/properties"
                className={cn(
                  buttonVariants({ variant: "white", size: "lg" }),
                  "group"
                )}
              >
                Browse Verified Homes
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              {/* Landlord Dropdown — client island for click-toggle + a11y */}
              <LandlordDropdown
                direction="up"
                triggerClassName={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "w-full sm:w-auto border-white/30 text-white hover:bg-white/10"
                )}
              />
            </div>

            {/* Trust Points */}
            <div className="mt-8 flex flex-wrap gap-6 justify-center lg:justify-start text-white/70 text-sm">
              <span>✓ Free for tenants</span>
              <span>✓ No credit card required</span>
              <span>✓ Cancel anytime</span>
            </div>
          </div>

          {/* Image */}
          <div className="hidden lg:block relative">
            <div className="relative aspect-square max-w-md mx-auto">
              <Image
                src="https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/people/family-photo-1.jpg"
                alt="Happy family in their new Nairobi home"
                fill
                className="object-cover rounded-2xl shadow-2xl"
                sizes="(min-width: 1024px) 400px, 100vw"
              />
              {/* Floating card */}
              <div className="absolute -bottom-6 -left-6 bg-white rounded-xl p-4 shadow-strong max-w-[200px]">
                <p className="text-sm font-semibold text-gray-900">
                  &ldquo;Found our dream apartment in just 5 days!&rdquo;
                </p>
                <p className="text-xs text-gray-500 mt-1">— New MitaSafi User</p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
