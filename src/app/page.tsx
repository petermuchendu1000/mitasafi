import { Suspense } from "react";

// Import all components directly to avoid Turbopack barrel export issues
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { TrustBar } from "@/components/landing/TrustBar";
import { ServiceCategoriesShowcase } from "@/components/landing/ServiceCategoriesShowcase";
import { RecentlyViewedSection } from "@/components/landing/RecentlyViewedSection";
import { PopularServicesSection } from "@/components/landing/PopularServicesSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { ServiceDiscoverySection } from "@/components/landing/ServiceDiscoverySection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { NeighborhoodsSection } from "@/components/landing/NeighborhoodsSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";

// 🔍 PERFORMANCE: Server-side logging
import { PerformanceLogger } from "@/lib/performance";

export default async function HomePage() {
  const perf = new PerformanceLogger('HomePage Render')
  
  perf.start('component-initialization')
  // All components are rendered on the server
  perf.end('component-initialization')
  
  // Log only if rendering takes >500ms
  perf.logSummary(500)
  
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <TrustBar />
        <ServiceCategoriesShowcase />
        <Suspense fallback={null}>
          <RecentlyViewedSection />
        </Suspense>
        <PopularServicesSection />
        <ProblemSection />
        <FeaturesSection />
        <Suspense fallback={null}>
          <ServiceDiscoverySection />
        </Suspense>
        <HowItWorksSection />
        <NeighborhoodsSection />
        <TestimonialsSection />
        <PricingSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
