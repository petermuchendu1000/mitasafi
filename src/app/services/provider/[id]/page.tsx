/**
 * Service Provider Profile Page
 *
 * Trust-focused design for clients evaluating service providers.
 * URL: /services/provider/[id]
 *
 * Trust Signals (Priority Order):
 * 1. Verification badges + credentials
 * 2. Rating + review count + completion rate
 * 3. Jobs completed + years experience
 * 4. Response time + availability
 * 5. Portfolio/work samples
 * 6. Detailed reviews with attribution
 */

import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import {
  Star,
  CheckCircle,
  ChevronRight,
  ArrowLeft,
  Pencil,
  Phone,
  Clock3,
  CalendarDays,
  Users,
  MapPin,
  BadgeCheck,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import Link from "next/link";
import { getProviderByIdCached, getSimilarProviders } from "@/lib/services/providers";
import dynamic from "next/dynamic";
import { getProviderReviewsWithVotes } from "@/lib/services/reviews";
import { formatRating, getCategoryById } from "@/lib/constants";
import { getResponseTimeLabel, type WorkingHoursEntry } from "@/types/service-providers";
import type { ReviewWithReviewer } from "@/types/reviews";
import { ProviderCard } from "@/components/services/ProviderCard";
import { SocialLinksSection } from "@/components/services/SocialLinksSection";
import { ShareButton } from "@/components/services/ShareButton";
import { createClient } from "@/lib/supabase/server";
import { ExpandableText } from "@/components/ui/ExpandableText";

// Below-fold client components — lazy loaded to reduce initial JS bundle
const ProviderServiceCards = dynamic(
  () => import("@/components/services/ProviderServiceCards").then((m) => m.ProviderServiceCards),
  { ssr: true }
);
const ProviderReviewsList = dynamic(
  () => import("@/components/services/ProviderReviewsList").then((m) => m.ProviderReviewsList),
  { ssr: true }
);

// =============================================================================
// HELPERS
// =============================================================================

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatTime(time: string | null): string {
  if (!time) return "";
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

function timeToMinutes(time: string | null): number | null {
  if (!time) return null;
  const [h, m] = time.split(":");
  const hours = parseInt(h, 10);
  const minutes = parseInt(m, 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function getCurrentNairobiDayAndMinutes() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value || "Sun";
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);

  const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
  return {
    dayOfWeek: weekdayIndex >= 0 ? weekdayIndex : 0,
    minutes: (Number.isNaN(hour) ? 0 : hour) * 60 + (Number.isNaN(minute) ? 0 : minute),
  };
}

function getYearsLabel(years: string | number | null | undefined): string | null {
  if (!years) return null;
  const num = typeof years === "string" ? parseInt(years, 10) : years;
  if (isNaN(num) || num <= 0) return null;
  return num === 1 ? "1 year" : `${num} years`;
}

function memberSinceLabel(createdAt: string | null): string | null {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  return d.toLocaleDateString("en-KE", { month: "short", year: "numeric" });
}

function lastActiveLabel(lastActive: string | null): string | null {
  if (!lastActive) return null;
  const d = new Date(lastActive);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 5) return "Online now";
  if (diffMins < 60) return `Active ${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Active ${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `Active ${diffDays}d ago`;
  return null;
}

// =============================================================================
// TYPES
// =============================================================================

interface PageProps {
  params: Promise<{ id: string }>;
}

// =============================================================================
// METADATA
// =============================================================================

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { provider, error } = await getProviderByIdCached(id);

  if (error || !provider) {
    return {
      title: "Provider Not Found | MitaSafi",
      description: "This service provider is no longer available.",
    };
  }

  const firstCategoryId = provider.categories?.[0];
  const firstCategory = firstCategoryId ? getCategoryById(firstCategoryId) : null;

  const title = `${provider.business_name} | ${firstCategory?.name || "Service Provider"} | MitaSafi`;
  const description =
    provider.bio?.slice(0, 160) ||
    `${provider.business_name} - Verified service provider in Nairobi. ${provider.average_rating ? `${formatRating(provider.average_rating)} stars` : ""}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: provider.profile_photo_url ? [provider.profile_photo_url] : [],
      type: "profile",
    },
  };
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default async function ProviderProfilePage({ params }: PageProps) {
  const { id } = await params;

  const [providerResult, reviewsResult, similarProviders, supabase] = await Promise.all([
    getProviderByIdCached(id),
    getProviderReviewsWithVotes({ providerId: id, page: 1, pageSize: 6 }),
    getSimilarProviders(id, 4),
    createClient(),
  ]);

  if (providerResult.error || !providerResult.provider) {
    notFound();
  }

  const provider = providerResult.provider;
  const reviews: ReviewWithReviewer[] = reviewsResult.data || [];
  const totalReviews = reviewsResult.pagination.total || 0;

  // Check if current user is the provider (for contextual navigation)
  const { data: { user } } = await supabase.auth.getUser();
  const providerAny = provider as unknown as Record<string, unknown>;
  const isOwnProfile = !!(user && providerAny.user_id === user.id);

  // Extract services with pricing - cast to any since Supabase returns dynamic JSON
  const servicesWithPricing = (provider.services || [])
    .filter((ps) => ps.is_active)
    .map((ps) => {
      const psAny = ps as unknown as Record<string, unknown>;
      const cp = psAny.custom_pricing as Record<string, unknown> | null;
      const imageUrls = Array.isArray(cp?.image_urls) ? (cp.image_urls as string[]) : [];
      return {
        id: ps.id,
        name: ps.service?.name || "Service",
        category: ps.service?.subcategory?.category?.name || "",
        subcategory: ps.service?.subcategory?.name || "",
        priceType: (cp?.type as string) || "fixed",
        price: (cp?.amount as number) || null,
        description: (cp?.description as string) || ps.service?.description || "",
        imageUrls,
      };
    });



  // Working hours
  const workingHours = (provider.working_hours || []) as WorkingHoursEntry[];
  const normalizedWorkingHours = Array.from({ length: 7 }, (_, dayOfWeek) => {
    const found = workingHours.find((entry) => entry.day_of_week === dayOfWeek);
    return (
      found || {
        day_of_week: dayOfWeek,
        is_available: false,
        start_time: null,
        end_time: null,
      }
    );
  });

  const { dayOfWeek: currentDayOfWeek, minutes: currentMinutes } = getCurrentNairobiDayAndMinutes();
  const todaySchedule = normalizedWorkingHours[currentDayOfWeek];
  const todayStart = timeToMinutes(todaySchedule.start_time);
  const todayEnd = timeToMinutes(todaySchedule.end_time);

  const isOpenNow =
    !!todaySchedule?.is_available &&
    todayStart != null &&
    todayEnd != null &&
    currentMinutes >= todayStart &&
    currentMinutes < todayEnd;

  let nextAvailabilityLabel: string | null = null;
  if (!isOpenNow) {
    for (let offset = 0; offset < 7; offset += 1) {
      const checkDay = (currentDayOfWeek + offset) % 7;
      const slot = normalizedWorkingHours[checkDay];
      const start = timeToMinutes(slot.start_time);

      if (!slot.is_available || start == null) continue;

      const isFutureToday = offset === 0 && currentMinutes < start;
      const isFutureDay = offset > 0;

      if (!isFutureToday && !isFutureDay) continue;

      if (offset === 0) {
        nextAvailabilityLabel = `Opens at ${formatTime(slot.start_time)}`;
      } else if (offset === 1) {
        nextAvailabilityLabel = `Opens tomorrow at ${formatTime(slot.start_time)}`;
      } else {
        nextAvailabilityLabel = `Opens ${DAY_LABELS[checkDay]} at ${formatTime(slot.start_time)}`;
      }
      break;
    }
  }

  const availabilityStatusLabel = isOpenNow
    ? `Open now · Closes at ${formatTime(todaySchedule.end_time)}`
    : nextAvailabilityLabel;

  // Trust signals
  const yearsLabel = getYearsLabel(providerAny.years_experience as string | number | null || providerAny.years_in_business as number | null);
  const memberSince = memberSinceLabel(provider.created_at);
  const lastActive = lastActiveLabel(providerAny.last_active_at as string | null);
  const isOnline = lastActive === "Online now";

  // Format phone for WhatsApp
  const phone = providerAny.phone as string | undefined;
  const whatsappNumber = (providerAny.whatsapp as string) || phone;
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hi ${provider.business_name}, I found you on MitaSafi and I'm interested in your services.`)}`
    : null;
  const phoneUrl = phone ? `tel:${phone}` : null;

  // Trust signals — only what reduces customer risk
  const hasBusinessReg = !!providerAny.registration_number;
  const hasTaxId = !!providerAny.tax_id;

  // Derive verification signals from per-service verification data
  const rawServices = provider.services || [];
  const activeServices = rawServices.filter((ps) => ps.is_active);
  const verifiedServices = activeServices.filter(
    (ps) => (ps as unknown as Record<string, unknown>).verification_status === "verified"
  );
  const verifiedServiceLevels = new Set(
    verifiedServices
      .map((ps) => (ps.service as unknown as Record<string, unknown>)?.min_verification_level as string)
      .filter(Boolean)
  );
  const isIdentityVerified = verifiedServiceLevels.has("basic") || verifiedServiceLevels.has("standard") || verifiedServiceLevels.has("certified") || verifiedServiceLevels.has("background_checked");
  const isBackgroundChecked = verifiedServiceLevels.has("background_checked");

  const trustItems = [
    { key: "identity", show: isIdentityVerified, label: "Identity verified" },
    { key: "background", show: isBackgroundChecked, label: "Background checked" },
    { key: "registration", show: hasBusinessReg, label: "Registered business" },
    { key: "tax", show: hasTaxId, label: "KRA registered" },
  ].filter((item) => item.show);

  const serviceAreas = provider.service_areas || [];
  const teamSize = providerAny.team_size as number | undefined;
  const languages = providerAny.languages as string[] | undefined;
  const heroImageUrl =
    provider.cover_photo_url || servicesWithPricing.find((s) => s.imageUrls.length > 0)?.imageUrls[0] || null;
  const hasAbout = !!provider.bio;
  const hasServices = servicesWithPricing.length > 0;
  const hasReviews = (provider.total_reviews ?? 0) > 0;
  const surfaceCardClass = "rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm";
  const sectionTitleClass = "text-base font-semibold tracking-[-0.01em] leading-6 text-slate-900 mb-4";
  const ratingText = provider.average_rating == null ? "No ratings yet" : formatRating(provider.average_rating);

  // Social links
  const socialLinks = (providerAny.social_links || {}) as Record<string, string>;
  const SOCIAL_LABEL_MAP: Record<string, string> = {
    website: "Website",
    facebook: "Facebook",
    instagram: "Instagram",
    tiktok: "TikTok",
    twitter: "X (Twitter)",
    linkedin: "LinkedIn",
    youtube: "YouTube",
  };
  const socialEntries = Object.entries(socialLinks).filter(([, v]) => !!v?.trim());

  // ── JSON-LD Structured Data ──
  const firstCategoryId = provider.categories?.[0];
  const firstCategory = firstCategoryId ? getCategoryById(firstCategoryId) : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: provider.business_name,
    description: provider.bio?.slice(0, 300) || `${provider.business_name} — verified service provider on MitaSafi`,
    url: `https://mitasafi.co.ke/services/provider/${provider.id}`,
    ...(provider.profile_photo_url ? { image: provider.profile_photo_url } : {}),
    ...(phone ? { telephone: phone } : {}),
    address: {
      "@type": "PostalAddress",
      addressLocality: "Nairobi",
      addressCountry: "KE",
    },
    ...(provider.average_rating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: provider.average_rating,
            reviewCount: provider.total_reviews || 0,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    ...(firstCategory ? { category: firstCategory.name } : {}),
    ...(servicesWithPricing.length > 0
      ? {
          makesOffer: servicesWithPricing.slice(0, 5).map((s) => ({
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: s.name,
              description: s.description?.slice(0, 200) || undefined,
            },
            ...(s.price ? { price: s.price, priceCurrency: "KES" } : {}),
          })),
        }
      : {}),
    areaServed: (serviceAreas || []).slice(0, 10).map((area) => ({
      "@type": "City",
      name: area,
    })),
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* JSON-LD Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ─── Navigation Bar ─── */}
      <nav className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 sm:h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isOwnProfile ? (
              <>
                <Link
                  href="/dashboard/provider"
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Back to dashboard</span>
                </Link>
                <span className="text-gray-200 hidden sm:inline">|</span>
                <div className="hidden sm:flex items-center gap-1.5 text-sm text-gray-400">
                  <Link href="/dashboard/provider" className="hover:text-gray-600 transition-colors">
                    Dashboard
                  </Link>
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span className="text-gray-600">Your Profile</span>
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/services/browse"
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Back to search</span>
                </Link>
                <span className="text-gray-200 hidden sm:inline">|</span>
                <div className="hidden sm:flex items-center gap-1.5 text-sm text-gray-400">
                  <Link href="/services/browse" className="hover:text-gray-600 transition-colors">
                    Services
                  </Link>
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span className="text-gray-600">{provider.business_name}</span>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isOwnProfile && (
              <Link
                href="/dashboard/provider/profile"
                className="text-sm text-teal-600 hover:text-teal-700 transition-colors flex items-center gap-1.5"
              >
                <Pencil className="w-4 h-4" />
                <span className="hidden sm:inline">Edit Profile</span>
              </Link>
            )}
            <div className="hidden sm:block">
              <ShareButton
                title={provider.business_name}
                text={`Check out ${provider.business_name} on MitaSafi`}
                url={`https://mitasafi.co.ke/services/provider/${provider.id}`}
              />
            </div>
          </div>
        </div>
      </nav>

      {/* ─── Premium Hero ─── */}
      <section className="relative border-b border-slate-200">
        <div className="absolute inset-0">
          {heroImageUrl ? (
            <Image src={heroImageUrl} alt={provider.business_name} fill className="object-cover" priority sizes="100vw" />
          ) : (
            <div className="h-full w-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/60 to-slate-950/40" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
          <div className="flex flex-col md:flex-row md:items-end gap-6">
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden ring-4 ring-white/20 border border-white/20 bg-white/10 backdrop-blur">
              {provider.profile_photo_url ? (
                <Image
                  src={provider.profile_photo_url}
                  alt={provider.business_name}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-teal-100 text-teal-700 font-semibold text-3xl">
                  {provider.business_name.charAt(0)}
                </div>
              )}
              {isOnline && <div className="absolute right-1.5 bottom-1.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-slate-900" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-2xl sm:text-4xl font-semibold tracking-[-0.02em] leading-[1.08] text-white">{provider.business_name}</h1>
                {provider.is_verified && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200 border border-emerald-400/40">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    Verified
                  </span>
                )}
                {memberSince && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-100 border border-white/20">
                    <CalendarDays className="w-3.5 h-3.5" />
                    Member since {memberSince}
                  </span>
                )}
              </div>

              {((providerAny.headline as string) || (providerAny.tagline as string)) && (
                <p className="text-sm sm:text-base leading-7 text-slate-100/90 max-w-3xl">
                  {(providerAny.headline as string) || (providerAny.tagline as string)}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white text-slate-900 px-3 py-1.5 font-semibold">
                  <Star className="w-3.5 h-3.5 fill-slate-900 text-slate-900" />
                  {ratingText}
                </span>
                {provider.response_time_minutes != null && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 text-white px-3 py-1.5">
                    <Clock3 className="w-3.5 h-3.5" />
                    {getResponseTimeLabel(provider.response_time_minutes)}
                  </span>
                )}
              </div>

              {serviceAreas && serviceAreas.length > 0 && (
                <p className="mt-2 text-xs sm:text-sm text-slate-100/90 inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {serviceAreas[0]}
                  {serviceAreas.length > 1 && ` +${serviceAreas.length - 1} more areas`}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-nowrap items-center gap-2 overflow-x-auto whitespace-nowrap">
          {hasAbout && (
            <a
              href="#about-section"
              className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors"
            >
              About
            </a>
          )}
          {hasServices && (
            <a
              href="#services-section"
              className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors"
            >
              Services
            </a>
          )}
          {hasReviews && (
            <a
              href="#reviews-section"
              className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors"
            >
              Reviews
            </a>
          )}
        </div>
      </section>

      {/* ─── Main Content ─── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-28 lg:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 lg:gap-8">
          <main className="space-y-5 min-w-0">
            {provider.bio && (
              <section id="about-section" className={`scroll-mt-24 ${surfaceCardClass}`}>
                <h2 className={sectionTitleClass}>About this provider</h2>
                <ExpandableText
                  text={provider.bio}
                  maxChars={380}
                  className="text-[15px] leading-7 text-slate-600"
                />
              </section>
            )}

            {servicesWithPricing.length > 0 && (
              <section id="services-section" className={`scroll-mt-24 ${surfaceCardClass}`}>
                <h2 className={sectionTitleClass}>
                  {servicesWithPricing.length === 1 ? "Service offered" : "Services by this provider"}
                </h2>
                <ProviderServiceCards
                  services={servicesWithPricing}
                  providerId={provider.id}
                  isOwnProfile={isOwnProfile}
                  phoneUrl={phoneUrl}
                  whatsappUrl={whatsappUrl}
                />
              </section>
            )}

            {((serviceAreas && serviceAreas.length > 0) || (languages && languages.length > 0)) && (
              <section className={surfaceCardClass}>
                <h2 className={sectionTitleClass}>Coverage and communication</h2>
                {serviceAreas && serviceAreas.length > 0 && (
                  <div className="mb-5">
                    <p className="text-xs uppercase tracking-[0.04em] text-slate-500 mb-2">Service areas</p>
                    <div className="flex flex-wrap gap-2">
                      {serviceAreas.slice(0, 16).map((area) => (
                        <span
                          key={area}
                          className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-xs font-medium"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {languages && languages.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-[0.04em] text-slate-500 mb-2">Languages</p>
                    <p className="text-sm text-slate-700">{languages.join(", ")}</p>
                  </div>
                )}
              </section>
            )}

            {trustItems.length > 0 && (
              <section className={surfaceCardClass}>
                <h2 className={sectionTitleClass}>Trust and verification</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {trustItems.map((item) => (
                    <div key={item.key} className="rounded-xl border border-slate-200 p-3 text-sm text-slate-800 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      {item.label}
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section id="reviews-section" className={`scroll-mt-24 ${surfaceCardClass}`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-semibold text-slate-900">Reviews</h2>
                <div className="text-sm text-slate-600">{totalReviews} review{totalReviews !== 1 ? "s" : ""}</div>
              </div>

              {totalReviews === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                  This provider is new on MitaSafi and has no public reviews yet. You can still evaluate service quality from pricing clarity, service details, and response behavior.
                </div>
              ) : (
                <ProviderReviewsList
                  providerId={id}
                  initialReviews={reviews}
                  totalReviews={totalReviews}
                  isAuthenticated={!!user}
                />
              )}
            </section>

            {similarProviders.length > 0 && (
              <section className={surfaceCardClass}>
                <h2 className="text-base font-semibold text-slate-900 mb-5">Similar providers</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {similarProviders.map((p) => (
                    <ProviderCard key={p.id} provider={p} />
                  ))}
                </div>
              </section>
            )}
          </main>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className={surfaceCardClass}>

              {provider.response_time_minutes != null && (
                <div className="mt-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-[11px] uppercase tracking-[0.04em] text-slate-500">Response</p>
                    <p className="text-xs font-semibold text-slate-900 mt-1">
                      {getResponseTimeLabel(provider.response_time_minutes)}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-4 space-y-2.5">
                {!isOwnProfile && (
                  <Link
                    href={`/services/provider/${provider.id}/request`}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-teal-600 text-white font-semibold text-sm rounded-xl hover:bg-teal-700 transition-colors shadow-sm"
                  >
                    Request
                  </Link>
                )}
                {(whatsappUrl || phoneUrl) && (
                  <div className={`grid gap-2 ${whatsappUrl && phoneUrl ? "grid-cols-2" : "grid-cols-1"}`}>
                    {whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full px-3 py-3 border border-slate-300 text-slate-800 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        <FaWhatsapp className="w-4 h-4" />
                        WhatsApp
                      </a>
                    )}
                    {phoneUrl && (
                      <a
                        href={phoneUrl}
                        className="flex items-center justify-center gap-2 w-full px-3 py-3 border border-slate-300 text-slate-800 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                        Call
                      </a>
                    )}
                  </div>
                )}
                {isOwnProfile && !whatsappUrl && !phoneUrl && (
                  <p className="text-sm text-slate-400 text-center py-2">Add contact info in your profile settings</p>
                )}
              </div>

              <p className="mt-3 text-xs text-slate-500 inline-flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                {lastActive || "Profile is active on MitaSafi"}
              </p>
            </div>

            <div className={surfaceCardClass}>
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Business facts</h3>
              <dl className="space-y-3 text-sm">
                {yearsLabel && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Experience</dt>
                    <dd className="text-slate-900 font-medium text-right">{yearsLabel}</dd>
                  </div>
                )}
                {teamSize && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500 inline-flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />Team size</dt>
                    <dd className="text-slate-900 font-medium text-right">{teamSize === 1 ? "Solo" : `${teamSize} people`}</dd>
                  </div>
                )}
                {memberSince && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Member since</dt>
                    <dd className="text-slate-900 font-medium text-right">{memberSince}</dd>
                  </div>
                )}
                {lastActive && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Last active</dt>
                    <dd className="text-slate-900 font-medium text-right">{lastActive}</dd>
                  </div>
                )}
              </dl>
            </div>

            {workingHours.length > 0 && (
              <div className={surfaceCardClass}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold tracking-[-0.01em] text-slate-900">Availability</h3>
                  <span className="text-[11px] font-medium text-slate-500">EAT</span>
                </div>

                {availabilityStatusLabel && (
                  <div className="mb-4 rounded-lg border border-slate-200 px-3 py-2">
                    <p className="text-xs text-slate-700">{availabilityStatusLabel}</p>
                  </div>
                )}

                <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
                  {normalizedWorkingHours.map((h) => {
                    const isToday = h.day_of_week === currentDayOfWeek;
                    const timeRange = h.is_available
                      ? `${formatTime(h.start_time)} – ${formatTime(h.end_time)}`
                      : "Closed all day";

                    return (
                      <div
                        key={h.day_of_week}
                        className="px-3 py-2.5"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm font-medium text-slate-700">{DAY_NAMES[h.day_of_week]}</span>
                            {isToday && (
                              <span className="text-[11px] text-slate-500 whitespace-nowrap">
                                (Today)
                              </span>
                            )}
                          </div>

                          <span className={`text-xs whitespace-nowrap ${h.is_available ? "text-slate-700" : "text-slate-500"}`}>
                            {h.is_available ? "Open" : "Closed"}
                          </span>
                        </div>

                        <p className={`mt-1 text-sm leading-5 ${h.is_available ? "text-slate-900" : "text-slate-500"}`}>
                          {timeRange}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {socialEntries.length > 0 && (
              <SocialLinksSection providerId={provider.id} socialEntries={socialEntries} labelMap={SOCIAL_LABEL_MAP} />
            )}
          </aside>
        </div>
      </div>

      {/* ─── Mobile CTA Bar ─── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 z-40">
        <div className="flex items-center gap-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 truncate">{provider.business_name}</p>
            <p className="text-xs text-slate-500 truncate">{servicesWithPricing.length} service{servicesWithPricing.length !== 1 ? "s" : ""} available</p>
          </div>
          {!isOwnProfile && (
            <Link
              href={`/services/provider/${provider.id}/request`}
              className="px-4 py-2.5 bg-teal-600 text-white font-semibold text-sm rounded-lg hover:bg-teal-700 transition-colors"
            >
              Request
            </Link>
          )}
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:grid w-10 h-10 rounded-lg border border-slate-300 text-slate-700 place-items-center"
              aria-label="WhatsApp"
            >
              <FaWhatsapp className="w-4 h-4" />
            </a>
          )}
          {phoneUrl && (
            <a
              href={phoneUrl}
              className="hidden sm:grid w-10 h-10 rounded-lg border border-slate-300 text-slate-700 place-items-center"
              aria-label="Call"
            >
              <Phone className="w-4 h-4" />
            </a>
          )}
          {(whatsappUrl || phoneUrl) && (
            <a
              href={whatsappUrl || phoneUrl || "#"}
              target={whatsappUrl ? "_blank" : undefined}
              rel={whatsappUrl ? "noopener noreferrer" : undefined}
              className="sm:hidden px-3 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg"
            >
              {whatsappUrl ? "WhatsApp" : "Call"}
            </a>
          )}
        </div>
      </div>
      <div className="lg:hidden h-20" />
    </div>
  );
}
