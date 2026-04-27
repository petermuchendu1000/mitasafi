import Image from "next/image";
import Link from "next/link";
import { Badge, Container } from "@/components/ui";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Search, CheckCircle, Wrench } from "lucide-react";
import { LandlordDropdown } from "@/components/landing/LandlordDropdown";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/hero/nairobi-skyline-1.jpg"
          alt="Nairobi skyline with modern apartments"
          fill
          className="object-cover"
          priority
        />
        {/* Gradient Overlay - Darkened for text readability */}
        <div className="absolute inset-0 bg-gray-900/60" />
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900/80 via-gray-900/50 to-gray-900/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/70 via-transparent to-gray-900/40" />
      </div>

      {/* Content */}
      <Container className="relative z-10 pt-24 pb-16 lg:pt-32 lg:pb-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text Content */}
          <div className="text-white">
            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight mb-6">
              Renting Shouldn&apos;t Feel Like{" "}
              <span className="text-brand-400">Gambling</span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl sm:text-2xl text-gray-300 leading-relaxed mb-8 max-w-xl">
              Verified homes. Honest landlords. Payments with proof. Welcome to
              renting that finally makes sense.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Link
                href="/properties"
                className={cn(
                  buttonVariants({ variant: "primary", size: "lg" }),
                  "shadow-strong"
                )}
              >
                <Search className="w-5 h-5" />
                Browse Verified Homes
              </Link>
              
              {/* Landlord Dropdown — client island for click-toggle + a11y */}
              <LandlordDropdown
                direction="down"
                triggerClassName={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "w-full sm:w-auto"
                )}
              />
            </div>

            {/* Trust Points */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-300">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success-400" />
                Free for tenants
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success-400" />
                No broker fees
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success-400" />
                Verified listings only
              </span>
            </div>

            {/* Service Provider Link */}
            <div className="mt-6 pt-6 border-t border-white/20">
              <Link
                href="/signup?role=provider"
                className="text-sm text-gray-300 hover:text-white transition-colors inline-flex items-center gap-2"
              >
                <Wrench className="w-4 h-4" />
                Are you a service provider?
                <span className="text-brand-400 font-medium">Join our network →</span>
              </Link>
            </div>
          </div>

          {/* Family Image */}
          <div className="hidden lg:block">
            <div className="relative">
              {/* Main Image */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <Image
                  src="https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/people/family-home-2.jpg"
                  alt="Happy family enjoying their new home"
                  width={600}
                  height={500}
                  className="object-cover w-full h-auto"
                  priority
                />
              </div>
              {/* Decorative elements */}
              <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-brand-500/20 rounded-2xl -z-10" />
              <div className="absolute -top-4 -right-4 w-32 h-32 bg-cta-500/20 rounded-2xl -z-10" />
            </div>
          </div>
        </div>
      </Container>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1440 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
          preserveAspectRatio="none"
        >
          <path
            d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            fill="#F9FAFB"
          />
        </svg>
      </div>
    </section>
  );
}
