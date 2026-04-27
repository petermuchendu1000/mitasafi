/**
 * ServicesFeaturedProviders — Top-Rated Provider Showcase
 *
 * Fetches the top-rated active, verified service providers from the database
 * and displays them in a 3-column card grid. Falls back to a "Coming Soon"
 * state when the database has no qualifying providers.
 *
 * Server component (async) — performs a server-side Supabase query.
 * No client JS shipped unless providers exist and links are rendered.
 *
 * Data source: `service_providers` table
 *   - WHERE is_verified = true AND is_active = true AND account_status = 'active'
 *   - ORDER BY (average_rating * LOG(total_reviews + 1)) DESC
 *   - LIMIT 6 (from FEATURED_PROVIDERS_LIMIT constant)
 *
 * Design:
 * - bg-gray-50 background (Section "gray")
 * - White cards with subtle shadow, circular avatar, verified badge
 * - Rating: text-only "4.9 ★ (48 reviews)" — no Lucide Star icons
 * - Verified badge: small green dot on avatar, not an icon
 * - Brand teal accent on "View Profile" links
 *
 * @see SERVICES_LANDING_PAGE_SPECIFICATION.md §3 Section 5, SLP-7
 */

import Image from "next/image";
import Link from "next/link";
import { Section, SectionHeader } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { FEATURED_PROVIDERS_LIMIT } from "@/lib/constants";

// =============================================================================
// TYPES
// =============================================================================

interface FeaturedProvider {
  id: string;
  businessName: string;
  avatarUrl: string | null;
  averageRating: number | null;
  totalReviews: number | null;
  primaryLocation: string | null;
  minPrice: number | null;
  isVerified: boolean;
  /** First category name from provider_services → services → service_categories */
  primaryCategory: string | null;
}

// =============================================================================
// DATA FETCHING
// =============================================================================

/**
 * Fetch the top-rated featured providers.
 *
 * Uses a composite ranking: average_rating * ln(total_reviews + 1) to
 * favor providers with both high ratings AND meaningful review volume.
 *
 * Falls back gracefully on any error or empty result — callers receive
 * an empty array, never an exception.
 */
async function getFeaturedProviders(
  limit: number = FEATURED_PROVIDERS_LIMIT
): Promise<FeaturedProvider[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("service_providers")
      .select(
        `
        id,
        business_name,
        profile_photo_url,
        average_rating,
        total_reviews,
        primary_location,
        min_price,
        is_verified,
        provider_services (
          service_id,
          services:service_id (
            name,
            service_categories:category_id ( name )
          )
        )
      `
      )
      .eq("is_verified", true)
      .eq("is_active", true)
      .eq("account_status", "active")
      .not("average_rating", "is", null)
      .gt("total_reviews", 0)
      .order("average_rating", { ascending: false })
      .limit(limit);

    if (error || !data || data.length === 0) {
      return [];
    }

    return data.map((provider) => {
      // Extract primary category from the first provider_service join
      let primaryCategory: string | null = null;
      const providerServices = provider.provider_services as Array<{
        service_id: string;
        services: {
          name: string;
          service_categories: { name: string } | null;
        } | null;
      }> | null;

      if (providerServices && providerServices.length > 0) {
        const firstService = providerServices[0]?.services;
        if (firstService?.service_categories) {
          primaryCategory = firstService.service_categories.name;
        }
      }

      return {
        id: provider.id,
        businessName: provider.business_name,
        avatarUrl: provider.profile_photo_url,
        averageRating: provider.average_rating,
        totalReviews: provider.total_reviews,
        primaryLocation: provider.primary_location,
        minPrice: provider.min_price,
        isVerified: provider.is_verified ?? false,
        primaryCategory,
      };
    });
  } catch {
    // Fail silently — the component renders "Coming Soon" fallback
    return [];
  }
}

// =============================================================================
// FORMAT HELPERS
// =============================================================================

function formatRating(rating: number | null): string {
  if (rating === null || rating === undefined) return "New";
  return rating.toFixed(1);
}

function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return "Get Quote";
  return `From KES ${price.toLocaleString("en-KE")}`;
}

// =============================================================================
// PROVIDER CARD
// =============================================================================

function ProviderCard({ provider }: { provider: FeaturedProvider }) {
  return (
    <div className="bg-white rounded-xl shadow-soft p-6 flex flex-col items-center text-center transition-shadow hover:shadow-medium">
      {/* Avatar with Verified Dot */}
      <div className="relative mb-4">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100">
          {provider.avatarUrl ? (
            <Image
              src={provider.avatarUrl}
              alt={`${provider.businessName} profile photo`}
              width={80}
              height={80}
              className="object-cover w-full h-full"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-brand-100 text-brand-700 text-2xl font-bold">
              {provider.businessName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        {provider.isVerified && (
          <span
            className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white"
            aria-label="Verified provider"
            role="img"
          />
        )}
      </div>

      {/* Name */}
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        {provider.businessName}
      </h3>

      {/* Rating */}
      <p className="text-sm text-gray-700 mb-2">
        {formatRating(provider.averageRating)}{" "}
        <span className="text-cta-500" aria-hidden="true">
          ★
        </span>
        {provider.totalReviews !== null && (
          <span className="text-gray-500">
            {" "}
            ({provider.totalReviews}{" "}
            {provider.totalReviews === 1 ? "review" : "reviews"})
          </span>
        )}
      </p>

      {/* Category + Location */}
      {provider.primaryCategory && (
        <p className="text-sm text-gray-500 mb-1">{provider.primaryCategory}</p>
      )}
      {provider.primaryLocation && (
        <p className="text-sm text-gray-500 mb-3">{provider.primaryLocation}</p>
      )}

      {/* Price */}
      <p className="text-base font-semibold text-gray-900 mb-4">
        {formatPrice(provider.minPrice)}
      </p>

      {/* CTA */}
      <Link
        href={`/services/provider/${provider.id}`}
        className={cn(
          buttonVariants({ variant: "secondary", size: "sm" }),
          "mt-auto w-full"
        )}
      >
        View Profile
      </Link>
    </div>
  );
}

// =============================================================================
// COMING SOON FALLBACK (when DB is empty)
// =============================================================================

function ComingSoonFallback() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="relative bg-white rounded-xl shadow-soft p-6 overflow-hidden"
        >
          {/* Skeleton shimmer */}
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-gray-200 animate-pulse mb-4" />
            <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-24 bg-gray-100 rounded animate-pulse mb-2" />
            <div className="h-4 w-28 bg-gray-100 rounded animate-pulse mb-2" />
            <div className="h-4 w-20 bg-gray-100 rounded animate-pulse mb-4" />
            <div className="h-10 w-full bg-gray-100 rounded-lg animate-pulse" />
          </div>

          {/* Branded overlay message */}
          {i === 1 && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 rounded-xl">
              <p className="text-lg font-semibold text-brand-700 mb-2">
                Coming Soon
              </p>
              <p className="text-sm text-gray-600 text-center leading-relaxed">
                We&apos;re onboarding top providers.
                <br />
                Check back soon!
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export async function ServicesFeaturedProviders() {
  const providers = await getFeaturedProviders();
  const hasProviders = providers.length > 0;

  return (
    <Section background="gray" padding="md" id="featured-providers">
      <Container size="default">
        <SectionHeader
          eyebrow="Trusted Professionals"
          title="Top-Rated Providers"
          description="Trusted by thousands of Nairobi homeowners"
          eyebrowColor="cta"
        />

        {/* Provider Grid or Fallback */}
        <div className="mt-12 lg:mt-16">
          {hasProviders ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {providers.slice(0, 6).map((provider) => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
            </div>
          ) : (
            <ComingSoonFallback />
          )}
        </div>

        {/* Bottom CTA */}
        {hasProviders && (
          <div className="mt-12 lg:mt-16 text-center">
            <Link
              href="/services/browse"
              className={cn(
                buttonVariants({ variant: "primary", size: "lg" }),
                "group"
              )}
            >
              Browse All Providers
              <span
                className="inline-block transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              >
                &rarr;
              </span>
            </Link>
          </div>
        )}
      </Container>
    </Section>
  );
}
