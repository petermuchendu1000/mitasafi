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

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { ChevronDown, ChevronLeft, Pencil, Phone, Star } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import Link from "next/link";
import {
  getProviderByIdCached,
  getSimilarProviders,
} from "@/lib/services/providers";
import dynamic from "next/dynamic";
import { getProviderReviewsWithVotes } from "@/lib/services/reviews";
import { formatRating, getCategoryById } from "@/lib/constants";
import {
  getResponseTimeLabel,
  type WorkingHoursEntry,
} from "@/types/service-providers";
import type { ReviewWithReviewer } from "@/types/reviews";
import { ProviderCard } from "@/components/services/ProviderCard";
import { SocialLinksSection } from "@/components/services/SocialLinksSection";
import { ShareButton } from "@/components/services/ShareButton";
import { TrackProviderView } from "@/components/services/TrackProviderView";
import { createClient } from "@/lib/supabase/server";
import { ExpandableText } from "@/components/ui/ExpandableText";
import { siteUrl } from "@/lib/site/urls";
import { HomeIcon } from "@/components/landing/HomeIcons";
import { HomeNavbar } from "@/components/landing/HomeNavbar";
import { Footer } from "@/components/landing/Footer";
import { homeFont } from "@/components/landing/home-font";
import homeStyles from "@/components/landing/HomePage.module.css";
import styles from "./provider-profile.module.css";

// Below-fold client components — lazy loaded to reduce initial JS bundle
const ProviderServiceCards = dynamic(
  () =>
    import("@/components/services/ProviderServiceCards").then(
      (m) => m.ProviderServiceCards,
    ),
  { ssr: true },
);
const ProviderReviewsList = dynamic(
  () =>
    import("@/components/services/ProviderReviewsList").then(
      (m) => m.ProviderReviewsList,
    ),
  { ssr: true },
);

// =============================================================================
// HELPERS
// =============================================================================

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

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
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value || "Sun";
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
  const minute = parseInt(
    parts.find((p) => p.type === "minute")?.value || "0",
    10,
  );

  const weekdayIndex = [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
  ].indexOf(weekday);
  return {
    dayOfWeek: weekdayIndex >= 0 ? weekdayIndex : 0,
    minutes:
      (Number.isNaN(hour) ? 0 : hour) * 60 +
      (Number.isNaN(minute) ? 0 : minute),
  };
}

function getYearsLabel(
  years: string | number | null | undefined,
): string | null {
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
  if (diffMins < 5) return "Recently active";
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

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { provider, error } = await getProviderByIdCached(id);

  if (error || !provider) {
    return {
      title: "Provider Not Found | MitaSafi",
      description: "This service provider is no longer available.",
    };
  }

  const firstCategoryId = provider.categories?.[0];
  const firstCategory = firstCategoryId
    ? getCategoryById(firstCategoryId)
    : null;

  const title = `${provider.business_name} | ${firstCategory?.name || "Service Provider"} | MitaSafi`;
  const area = provider.service_areas?.[0];
  const description = provider.bio?.trim().slice(0, 160) ||
    `Explore services, coverage and reviews for ${provider.business_name}${area ? ` in ${area}` : ""} on MitaSafi.`;
  const canonical = siteUrl(`/services/provider/${provider.id}`);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
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

  const [providerResult, reviewsResult, similarProviders, supabase] =
    await Promise.all([
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const providerAny = provider as unknown as Record<string, unknown>;
  const isOwnProfile = !!(user && providerAny.user_id === user.id);

  // Extract services with pricing - cast to any since Supabase returns dynamic JSON
  const servicesWithPricing = (provider.services || [])
    .filter((ps) => ps.is_active)
    .map((ps) => {
      const psAny = ps as unknown as Record<string, unknown>;
      const cp = psAny.custom_pricing as Record<string, unknown> | null;
      const imageUrls = Array.isArray(cp?.image_urls)
        ? cp.image_urls.filter((url): url is string => typeof url === "string" && Boolean(url.trim()))
        : [];
      return {
        id: ps.id,
        name: ps.service?.name || "Service",
        category: ps.service?.subcategory?.category?.name || "",
        subcategory: ps.service?.subcategory?.name || "",
        priceType: (cp?.type as string) || "fixed",
        price: typeof cp?.amount === "number" ? cp.amount : null,
        description:
          (cp?.description as string) || ps.service?.description || "",
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

  const { dayOfWeek: currentDayOfWeek, minutes: currentMinutes } =
    getCurrentNairobiDayAndMinutes();
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
  const yearsLabel = getYearsLabel(
    (providerAny.years_experience as string | number | null) ||
      (providerAny.years_in_business as number | null),
  );
  const memberSince = memberSinceLabel(provider.created_at);
  const lastActive = lastActiveLabel(
    providerAny.last_active_at as string | null,
  );

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
    (ps) =>
      (ps as unknown as Record<string, unknown>).verification_status ===
      "verified",
  );
  const verifiedServiceLevels = new Set(
    verifiedServices
      .map(
        (ps) =>
          (ps.service as unknown as Record<string, unknown>)
            ?.min_verification_level as string,
      )
      .filter(Boolean),
  );
  const isIdentityVerified =
    verifiedServiceLevels.has("basic") ||
    verifiedServiceLevels.has("standard") ||
    verifiedServiceLevels.has("certified") ||
    verifiedServiceLevels.has("background_checked");
  const isBackgroundChecked = verifiedServiceLevels.has("background_checked");

  const trustItems = [
    { key: "identity", show: isIdentityVerified, label: "Identity verified" },
    {
      key: "background",
      show: isBackgroundChecked,
      label: "Background checked",
    },
    { key: "registration", show: hasBusinessReg, label: "Business registration provided" },
    { key: "tax", show: hasTaxId, label: "KRA PIN provided" },
  ].filter((item) => item.show);

  const serviceAreas = provider.service_areas || [];
  const teamSize = providerAny.team_size as number | undefined;
  const languages = providerAny.languages as string[] | undefined;
  const heroImageUrl = provider.cover_photo_url;
  const headline = provider.headline?.trim() || provider.tagline?.trim();
  const bio = provider.bio?.trim();
  const hasServices = servicesWithPricing.length > 0;
  const canonical = siteUrl(`/services/provider/${provider.id}`);
  const requestHref = `/services/provider/${provider.id}/request`;
  const hasFacts = yearsLabel || teamSize || memberSince || lastActive;

  // Social links
  const socialLinks = (providerAny.social_links || {}) as Record<
    string,
    string
  >;
  const SOCIAL_LABEL_MAP: Record<string, string> = {
    website: "Website",
    facebook: "Facebook",
    instagram: "Instagram",
    tiktok: "TikTok",
    twitter: "X (Twitter)",
    linkedin: "LinkedIn",
    youtube: "YouTube",
  };
  const socialEntries = Object.entries(socialLinks).filter(
    ([, v]) => !!v?.trim(),
  );

  // ── JSON-LD Structured Data ──
  const firstCategoryId = provider.categories?.[0];
  const firstCategory = firstCategoryId
    ? getCategoryById(firstCategoryId)
    : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: provider.business_name,
    description:
      provider.bio?.slice(0, 300) ||
      `${provider.business_name} on MitaSafi`,
    url: canonical,
    ...(provider.profile_photo_url
      ? { image: provider.profile_photo_url }
      : {}),
    ...(phone ? { telephone: phone } : {}),
    ...(provider.average_rating && totalReviews > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: provider.average_rating,
            reviewCount: totalReviews,
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
      "@type": "Place",
      name: area,
    })),
  };

  // Cheapest active service, for the recently-viewed card. servicesWithPricing is
  // already built above; quote-only services have a null price and are skipped.
  const servicePrices = servicesWithPricing
    .map((s) => s.price)
    .filter((price): price is number => typeof price === "number");
  const minServicePrice =
    servicePrices.length > 0 ? Math.min(...servicePrices) : null;

  return (
    <div className={[homeFont.variable, homeStyles.home, styles.page, !isOwnProfile && styles.withAction].filter(Boolean).join(" ")}>
      <TrackProviderView
        id={provider.id}
        businessName={provider.business_name}
        tagline={headline ?? null}
        logoUrl={provider.profile_photo_url ?? null}
        ratingAverage={provider.average_rating ?? null}
        ratingCount={provider.total_reviews ?? null}
        minPrice={minServicePrice}
        categoryIds={(provider.categories ?? []).join(",")}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <a className={homeStyles.skipLink} href="#provider-content">Skip to provider profile</a>
      <HomeNavbar activePage="services" />

      <main id="provider-content" tabIndex={-1}>
        <header className={styles.intro}>
          <div className={styles.wrap}>
            <div className={styles.topLine}>
              <nav aria-label="Back navigation">
                <Link href={isOwnProfile ? "/dashboard/provider" : "/services/browse"} className={styles.back}>
                  <ChevronLeft size={17} aria-hidden="true" /> {isOwnProfile ? "Dashboard" : "Browse services"}
                </Link>
              </nav>
              <div className={styles.utilities}>
                {isOwnProfile && <Link href="/dashboard/provider/profile" className={styles.utility}>
                  <Pencil size={16} aria-hidden="true" /> Edit profile
                </Link>}
                <ShareButton title={provider.business_name} text={provider.business_name} url={canonical} className={styles.utility} />
              </div>
            </div>

            <div className={styles.introLayout}>
              <div className={styles.identity}>
                {provider.profile_photo_url && (
                  <div className={styles.avatar}>
                    <Image src={provider.profile_photo_url} alt="" fill sizes="72px" className={styles.photo} />
                  </div>
                )}
                <h1>{provider.business_name}</h1>
                {headline && <p className={styles.headline}>{headline}</p>}
                <div className={styles.profileMeta}>
                  {provider.average_rating && totalReviews > 0 ? (
                    <a href="#reviews-section">
                      <Star size={16} aria-hidden="true" className={styles.star} />
                      <strong>{formatRating(provider.average_rating)}</strong>
                      <span>{totalReviews} {totalReviews === 1 ? "review" : "reviews"}</span>
                    </a>
                  ) : null}
                  {(provider.is_verified || isIdentityVerified) && <span><HomeIcon name="shield" size={18} /> {isIdentityVerified ? "Identity verified" : "Verified provider"}</span>}
                  {serviceAreas.length > 0 && (
                    <a href="#coverage-section"><HomeIcon name="pin" size={18} />
                      <span>{serviceAreas.slice(0, 2).join(", ")}{serviceAreas.length > 2 ? " +" + (serviceAreas.length - 2) : ""}</span>
                    </a>
                  )}
                </div>
              </div>
              {heroImageUrl && (
                <div className={styles.cover}>
                  <Image src={heroImageUrl} alt="" fill sizes="(max-width: 759px) 100vw, 550px" priority
                    unoptimized={heroImageUrl.startsWith("/images/services-landing/optimized/")} className={styles.photo} />
                </div>
              )}
            </div>
            <nav className={styles.jumpLinks} aria-label="On this profile">
              <a href="#services-section">Services</a>
              <a href="#reviews-section">Reviews</a>
              {(serviceAreas.length > 0 || languages?.length) ? <a href="#coverage-section">Coverage</a> : null}
              {bio && <a href="#about-section">About</a>}
            </nav>
          </div>
        </header>

        <div className={styles.wrap}>
          <div className={styles.layout}>
            <section className={styles.services} id="services-section" aria-labelledby="provider-services-heading">
              <h2 id="provider-services-heading">Services</h2>
              {hasServices ? (
                <ProviderServiceCards
                  services={servicesWithPricing.map((service) => service.imageUrls[0] === heroImageUrl && service.imageUrls.length > 1
                    ? { ...service, imageUrls: [...service.imageUrls.slice(1), service.imageUrls[0]] } : service)}
                  providerId={provider.id}
                  isOwnProfile={isOwnProfile}
                  phoneUrl={phoneUrl}
                  whatsappUrl={whatsappUrl}
                  profileLayout
                />
              ) : <p className={styles.note}>No services listed yet.</p>}
            </section>

            <aside id="provider-contact" className={styles.sidebar} aria-label="Provider contact and hours">
              <section className={styles.contact} aria-labelledby="provider-contact-heading">
                <h2 id="provider-contact-heading">{isOwnProfile ? "Your public profile" : "Get in touch"}</h2>
                {isOwnProfile
                  ? <Link href="/dashboard/provider/profile" className={styles.primary}>Edit public profile</Link>
                  : <Link href={requestHref} className={styles.primary}>Request a service <HomeIcon name="arrow" size={17} /></Link>}
                {(whatsappUrl || phoneUrl) && (
                  <div className={styles.contactLinks}>
                    {whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"><FaWhatsapp size={18} aria-hidden="true" /> WhatsApp</a>}
                    {phoneUrl && <a href={phoneUrl}><Phone size={16} aria-hidden="true" /> Call</a>}
                  </div>
                )}
                {provider.response_time_minutes != null && <p className={styles.note}>{getResponseTimeLabel(provider.response_time_minutes)}</p>}
                {workingHours.length > 0 && (
                  <details className={styles.hours}>
                    <summary>Working hours <ChevronDown size={16} aria-hidden="true" /></summary>
                    {availabilityStatusLabel && <p className={styles.note}>{availabilityStatusLabel}</p>}
                    <p className={styles.note}>East Africa Time</p>
                    <dl className={styles.schedule} aria-label="Working hours in East Africa Time">
                      {normalizedWorkingHours.map((hours) => (
                        <div key={hours.day_of_week}>
                          <dt>{DAY_NAMES[hours.day_of_week]}{hours.day_of_week === currentDayOfWeek ? " (Today)" : ""}</dt>
                          <dd>{hours.is_available ? [formatTime(hours.start_time), formatTime(hours.end_time)].filter(Boolean).join(" – ") : "Closed"}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                )}
              </section>
              {socialEntries.length > 0 && <SocialLinksSection providerId={provider.id} socialEntries={socialEntries} labelMap={SOCIAL_LABEL_MAP} />}
            </aside>

            <div className={styles.sections}>
              {bio && (
                <section id="about-section" aria-labelledby="provider-about-heading">
                  <h2 id="provider-about-heading">About {provider.business_name}</h2>
                  <ExpandableText text={bio} maxChars={380} className={styles.prose} buttonClassName={styles.textButton} />
                </section>
              )}

              {(serviceAreas.length > 0 || languages?.length) ? (
                <section id="coverage-section" aria-labelledby="provider-coverage-heading">
                  <h2 id="provider-coverage-heading">Service areas</h2>
                  {serviceAreas.length > 0
                    ? <p className={styles.coverage}><HomeIcon name="pin" size={18} /> <span>{serviceAreas.join(", ")}</span></p>
                    : <p className={styles.note}>Ask this provider if they cover your area.</p>}
                  {languages?.length ? <dl className={styles.facts}><div><dt>Languages</dt><dd>{languages.join(", ")}</dd></div></dl> : null}
                </section>
              ) : null}

              <section id="reviews-section" aria-labelledby="provider-reviews-heading">
                <div className={styles.sectionHead}>
                  <h2 id="provider-reviews-heading">Reviews</h2>
                  {totalReviews > 0 && <span>{totalReviews} {totalReviews === 1 ? "review" : "reviews"}</span>}
                </div>
                {totalReviews === 0 ? <p className={styles.note}>No public reviews yet.</p> : (
                  <ProviderReviewsList providerId={id} initialReviews={reviews} totalReviews={totalReviews} isAuthenticated={!!user} />
                )}
              </section>

              {(trustItems.length > 0 || hasFacts) && (
                <section aria-labelledby="provider-business-heading">
                  <h2 id="provider-business-heading">Business details</h2>
                  {trustItems.length > 0 && (
                    <ul className={styles.trust} role="list">
                      {trustItems.map((item) => <li key={item.key}><HomeIcon name="shield" size={18} /> {item.label}</li>)}
                    </ul>
                  )}
                  {hasFacts && (
                    <dl className={styles.facts}>
                      {yearsLabel && <div><dt>Experience</dt><dd>{yearsLabel}</dd></div>}
                      {teamSize ? <div><dt>Team size</dt><dd>{teamSize === 1 ? "One person" : teamSize + " people"}</dd></div> : null}
                      {memberSince && <div><dt>On MitaSafi since</dt><dd>{memberSince}</dd></div>}
                      {lastActive && <div><dt>Last active</dt><dd>{lastActive}</dd></div>}
                    </dl>
                  )}
                </section>
              )}
            </div>
          </div>

          {similarProviders.length > 0 && (
            <section className={styles.related} aria-labelledby="similar-providers-heading">
              <div className={styles.sectionHead}>
                <h2 id="similar-providers-heading">Similar providers</h2>
                <Link href="/services/browse" className={styles.textLink}>Browse all <HomeIcon name="arrow" size={16} /></Link>
              </div>
              <ul className={styles.relatedGrid} role="list">
                {similarProviders.map((item) => <li key={item.id}><ProviderCard provider={item} variant="marketplace" showCompare={false} /></li>)}
              </ul>
            </section>
          )}
        </div>
      </main>

      <Footer />
      {!isOwnProfile && (
        <div className={styles.actionBar} role="group" aria-label="Provider actions">
          <Link href={requestHref} className={styles.primary}>Request a service <HomeIcon name="arrow" size={17} /></Link>
          {(whatsappUrl || phoneUrl) && <a href="#provider-contact" className={styles.secondary}>Contact</a>}
        </div>
      )}
    </div>
  );
}
