/**
 * Services Landing Page Components
 *
 * Barrel file for all components used on the `/services` landing page.
 * Each component corresponds to a page section defined in the
 * Services Landing Page Specification (SERVICES_LANDING_PAGE_SPECIFICATION.md).
 *
 * Components are added incrementally per milestone (SLP-3 through SLP-12).
 */

// SLP-2: Image Constants (single source of truth for all image URLs)
export { SERVICES_IMAGES, SERVICES_BLUR_DATA, getBlurDataURL } from "./images";
export type { ServicesImageKey } from "./images";

// SLP-3: ServicesNavbar
export { ServicesNavbar } from "./ServicesNavbar";

// SLP-4: ServicesHero
export { ServicesHero } from "./ServicesHero";

// SLP-4: ServicesTrustBar
export { ServicesTrustBar } from "./ServicesTrustBar";

// SLP-5: ServicesCategoryGrid
export { ServicesCategoryGrid } from "./ServicesCategoryGrid";

// SLP-6: ServicesHowItWorks
export { ServicesHowItWorks } from "./ServicesHowItWorks";

// SLP-7: ServicesFeaturedProviders
export { ServicesFeaturedProviders } from "./ServicesFeaturedProviders";

// SLP-8: ServicesWhyMitaSafi
export { ServicesWhyMitaSafi } from "./ServicesWhyMitaSafi";

// SLP-8: ServicesAreaCoverage
export { ServicesAreaCoverage } from "./ServicesAreaCoverage";

// SLP-9: ServicesPricingPreview
export { ServicesPricingPreview } from "./ServicesPricingPreview";

// SLP-10: ServicesTestimonials
export { ServicesTestimonials } from "./ServicesTestimonials";

// SLP-11: ServicesProviderCTA
export { ServicesProviderCTA } from "./ServicesProviderCTA";

// SLP-11: ServicesFinalCTA
export { ServicesFinalCTA } from "./ServicesFinalCTA";

// SLP-12: ServicesFAQ
export { ServicesFAQ } from "./ServicesFAQ";

// SLP-12: ServicesFAQ
// export { ServicesFAQ } from "./ServicesFAQ";
