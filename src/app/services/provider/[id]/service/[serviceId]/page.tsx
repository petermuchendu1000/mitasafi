/**
 * Service Detail Page — Fiverr-style Gig View
 *
 * Each provider service gets its own dedicated page so users can:
 * 1. See the full image gallery, description, and pricing
 * 2. Understand the service before committing to request
 * 3. Share a direct link to a specific service
 * 4. Browse other services by the same provider
 *
 * URL: /services/provider/[id]/service/[serviceId]
 *
 * Design inspired by Fiverr gig pages:
 * - Left: image gallery + service details + other services
 * - Right: sticky price card + provider mini-profile + CTA
 */

import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Star,
  CheckCircle,
  ChevronRight,
  ArrowLeft,
  Clock,
  MapPin,
  Phone,
  CalendarDays,
  BadgeCheck,
  ArrowUpRight,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { getProviderByIdCached } from "@/lib/services/providers";
import { formatServicePrice, formatRating, getCategoryById } from "@/lib/constants";
import { getResponseTimeLabel } from "@/types/service-providers";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/server";
import { ExpandableText } from "@/components/ui/ExpandableText";

const ServiceImageGallery = dynamic(
  () => import("@/components/services/ServiceImageGallery").then((m) => m.ServiceImageGallery),
  { ssr: true }
);
const ProviderServiceCards = dynamic(
  () => import("@/components/services/ProviderServiceCards").then((m) => m.ProviderServiceCards),
  { ssr: true }
);

// =============================================================================
// TYPES
// =============================================================================

interface PageProps {
  params: Promise<{ id: string; serviceId: string }>;
}

// =============================================================================
// METADATA
// =============================================================================

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id, serviceId } = await params;
  const { provider } = await getProviderByIdCached(id);

  if (!provider) {
    return { title: "Service Not Found | MitaSafi" };
  }

  const ps = (provider.services || []).find((s) => s.id === serviceId);
  const serviceName = ps?.service?.name || "Service";

  const title = `${serviceName} by ${provider.business_name} | MitaSafi`;
  const description = (() => {
    const psAny = ps as unknown as Record<string, unknown>;
    const cp = psAny?.custom_pricing as Record<string, unknown> | null;
    return (
      (cp?.description as string)?.slice(0, 160) ||
      ps?.service?.description?.slice(0, 160) ||
      `${serviceName} — offered by ${provider.business_name} on MitaSafi`
    );
  })();

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

// =============================================================================
// PAGE
// =============================================================================

export default async function ServiceDetailPage({ params }: PageProps) {
  const { id: providerId, serviceId } = await params;

  const [providerResult, supabase] = await Promise.all([
    getProviderByIdCached(providerId),
    createClient(),
  ]);

  if (providerResult.error || !providerResult.provider) {
    notFound();
  }

  const provider = providerResult.provider;
  const providerAny = provider as unknown as Record<string, unknown>;

  // Find the specific service
  const providerService = (provider.services || []).find(
    (ps) => ps.id === serviceId && ps.is_active
  );

  if (!providerService) {
    notFound();
  }

  // Auth check for CTA logic
  const { data: { user } } = await supabase.auth.getUser();
  const isOwnProfile = !!(user && providerAny.user_id === user.id);

  // ── Extract service data ──
  const psAny = providerService as unknown as Record<string, unknown>;
  const cp = psAny.custom_pricing as Record<string, unknown> | null;
  const imageUrls = Array.isArray(cp?.image_urls) ? (cp.image_urls as string[]) : [];
  const serviceName = providerService.service?.name || "Service";
  const categoryName = providerService.service?.subcategory?.category?.name || "";
  const subcategoryName = providerService.service?.subcategory?.name || "";
  const priceType = (cp?.type as string) || "fixed";
  const price = (cp?.amount as number) || null;
  const description = (cp?.description as string) || providerService.service?.description || "";
  const serviceDescription = providerService.service?.description || "";
  const serviceCreatedAt = psAny.created_at as string | null;

  // ── Other services by this provider (excluding current) ──
  const otherServices = (provider.services || [])
    .filter((ps) => ps.is_active && ps.id !== serviceId)
    .map((ps) => {
      const oPsAny = ps as unknown as Record<string, unknown>;
      const oCp = oPsAny.custom_pricing as Record<string, unknown> | null;
      const oImageUrls = Array.isArray(oCp?.image_urls) ? (oCp.image_urls as string[]) : [];
      return {
        id: ps.id,
        name: ps.service?.name || "Service",
        category: ps.service?.subcategory?.category?.name || "",
        subcategory: ps.service?.subcategory?.name || "",
        priceType: (oCp?.type as string) || "fixed",
        price: (oCp?.amount as number) || null,
        description: (oCp?.description as string) || ps.service?.description || "",
        imageUrls: oImageUrls,
      };
    });

  // ── Provider trust signals ──
  const serviceAreas = provider.service_areas || [];
  const phone = providerAny.phone as string | undefined;
  const phoneUrl = phone ? `tel:${phone}` : null;
  const whatsappNumber = (providerAny.whatsapp as string) || phone;
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Hi, I'm interested in your "${serviceName}" service on MitaSafi.`
      )}`
    : null;

  // ── Price display helpers ──
  const priceDisplay = (() => {
    if (priceType === "quote") return "Get Quote";
    const formatted = formatServicePrice(price);
    if (priceType === "starting_from") return `From ${formatted}`;
    if (priceType === "hourly") return `${formatted}/hr`;
    return formatted;
  })();

  const serviceSinceLabel = serviceCreatedAt
    ? new Date(serviceCreatedAt).toLocaleDateString("en-KE", { month: "short", year: "numeric" })
    : null;

  const { count: activeProvidersForSameService } = await supabase
    .from("provider_services")
    .select("id", { count: "exact", head: true })
    .eq("service_id", providerService.service_id)
    .eq("is_active", true);

  const { count: reviewsForThisService } = await supabase
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("provider_id", provider.id)
    .eq("service_id", providerService.service_id);

  const heroImageUrl = imageUrls[0] || provider.cover_photo_url || provider.profile_photo_url || null;
  const surfaceCardClass = "rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm";
  const sectionTitleClass = "text-base font-semibold tracking-[-0.01em] leading-6 text-slate-900 mb-4";
  const ratingText = provider.average_rating == null ? "No ratings yet" : formatRating(provider.average_rating);

  // ── JSON-LD for service-level SEO ──
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: serviceName,
    description: description?.slice(0, 300) || `${serviceName} by ${provider.business_name}`,
    provider: {
      "@type": "LocalBusiness",
      name: provider.business_name,
      url: `https://mitasafi.co.ke/services/provider/${provider.id}`,
    },
    ...(price ? { offers: { "@type": "Offer", price, priceCurrency: "KES" } } : {}),
    areaServed: serviceAreas.slice(0, 5).map((area) => ({
      "@type": "City",
      name: area,
    })),
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ─── Breadcrumb Navigation ─── */}
      <nav className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 sm:h-14 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm text-gray-400 min-w-0">
            <Link
              href={`/services/provider/${provider.id}`}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{provider.business_name}</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 hidden sm:block" />
            <span className="text-gray-600 truncate hidden sm:block">{serviceName}</span>
          </div>
          <Link
            href={`/services/provider/${provider.id}`}
            className="hidden sm:inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            View provider
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* ─── Premium Hero ─── */}
      <section className="relative border-b border-slate-200">
        <div className="absolute inset-0">
          {heroImageUrl ? (
            <Image src={heroImageUrl} alt={serviceName} fill className="object-cover" priority sizes="100vw" />
          ) : (
            <div className="h-full w-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/65 to-slate-950/50" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
          {(categoryName || subcategoryName) && (
            <div className="inline-flex items-center gap-1.5 text-xs text-slate-200/90 mb-3 px-2.5 py-1 rounded-full border border-white/20 bg-white/10">
              {categoryName && <span>{categoryName}</span>}
              {categoryName && subcategoryName && <ChevronRight className="w-3 h-3" />}
              {subcategoryName && <span className="font-medium">{subcategoryName}</span>}
            </div>
          )}

          <h1 className="text-2xl sm:text-4xl font-semibold tracking-[-0.02em] leading-[1.08] text-white max-w-4xl">{serviceName}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href={`/services/provider/${provider.id}`}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1.5 text-xs sm:text-sm text-white hover:bg-white/15 transition-colors"
            >
              <span className="font-semibold">{provider.business_name}</span>
              {provider.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-emerald-300" />}
            </Link>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-white text-slate-900 px-3 py-1.5 text-xs sm:text-sm font-semibold">
              <Star className="w-3.5 h-3.5 fill-slate-900 text-slate-900" />
              {ratingText}
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1.5 text-xs sm:text-sm text-white">
              {priceType === "quote" ? "Custom quote" : priceDisplay}
            </span>
          </div>

          {activeProvidersForSameService != null && activeProvidersForSameService >= 2 && (
            <p className="mt-2 text-xs sm:text-sm text-slate-100/90">
              Offered by {activeProvidersForSameService} provider{activeProvidersForSameService !== 1 ? "s" : ""} on MitaSafi.
            </p>
          )}
        </div>
      </section>

      {/* ─── Main Content ─── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-28 lg:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 lg:gap-8">
          <main className="space-y-5 min-w-0">
            <section className={`scroll-mt-24 ${surfaceCardClass}`}>
              {imageUrls.length > 0 && (
                <div className="mb-5">
                  <ServiceImageGallery images={imageUrls} title={serviceName} />
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 mb-3">
                {serviceSinceLabel && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-xs font-medium">
                    <CalendarDays className="w-3.5 h-3.5" />
                    Listed since {serviceSinceLabel}
                  </span>
                )}
                {reviewsForThisService != null && (
                  <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-xs font-medium">
                    {reviewsForThisService} service review{reviewsForThisService !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              <h2 className={sectionTitleClass}>About this service</h2>
              <ExpandableText
                text={description}
                maxChars={420}
                className="text-[15px] leading-7 text-slate-600"
              />

              {description !== serviceDescription && serviceDescription && (
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-[0.04em]">Platform service overview</p>
                  <ExpandableText
                    text={serviceDescription}
                    maxChars={260}
                    className="text-sm leading-7 text-slate-500"
                    expandLabel="Read full overview"
                    collapseLabel="Show less"
                  />
                </div>
              )}
            </section>

            <section className={`scroll-mt-24 ${surfaceCardClass}`}>
              <h2 className={sectionTitleClass}>Service facts</h2>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {categoryName && (
                  <div className="space-y-1">
                    <dt className="text-xs text-slate-400 font-medium uppercase tracking-[0.04em]">Category</dt>
                    <dd className="text-sm text-slate-900">{categoryName}</dd>
                  </div>
                )}
                <div className="space-y-1">
                  <dt className="text-xs text-slate-400 font-medium uppercase tracking-[0.04em]">Pricing model</dt>
                  <dd className="text-sm text-slate-900 font-medium capitalize">{priceType.replace("_", " ")}</dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-xs text-slate-400 font-medium uppercase tracking-[0.04em]">Displayed price</dt>
                  <dd className="text-sm text-slate-900 font-medium">{priceDisplay}</dd>
                </div>
                {provider.response_time_minutes != null && (
                  <div className="space-y-1">
                    <dt className="text-xs text-slate-400 font-medium uppercase tracking-[0.04em]">Provider response</dt>
                    <dd className="text-sm text-slate-900">{getResponseTimeLabel(provider.response_time_minutes)}</dd>
                  </div>
                )}
                {serviceAreas.length > 0 && (
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <dt className="text-xs text-slate-400 font-medium uppercase tracking-[0.04em]">Coverage</dt>
                    <dd className="text-sm text-slate-900">
                      {serviceAreas.slice(0, 3).join(", ")}
                      {serviceAreas.length > 3 && ` +${serviceAreas.length - 3} more`}
                    </dd>
                  </div>
                )}
              </dl>
            </section>

            <section className={`scroll-mt-24 ${surfaceCardClass}`}>
              <h2 className={sectionTitleClass}>Provider snapshot</h2>
              <Link href={`/services/provider/${provider.id}`} className="inline-flex items-center gap-3 group mb-4">
                <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
                  {provider.profile_photo_url ? (
                    <Image
                      src={provider.profile_photo_url}
                      alt={provider.business_name}
                      width={44}
                      height={44}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-teal-50 text-teal-700 font-semibold text-sm">
                      {provider.business_name.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">
                      {provider.business_name}
                    </span>
                    {provider.is_verified && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {provider.total_jobs_completed?.toLocaleString() || 0} completed jobs · {provider.total_reviews?.toLocaleString() || 0} reviews
                  </div>
                </div>
              </Link>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Provider rating</p>
                  <p className="text-sm sm:text-base font-semibold text-slate-900">{ratingText}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Active services</p>
                  <p className="text-base font-semibold text-slate-900">{(provider.services || []).filter((s) => s.is_active).length}</p>
                </div>
              </div>
            </section>

            {otherServices.length > 0 && (
              <section className={`scroll-mt-24 ${surfaceCardClass}`}>
                <h2 className={sectionTitleClass}>More services by {provider.business_name}</h2>
                <ProviderServiceCards
                  services={otherServices}
                  providerId={provider.id}
                  isOwnProfile={isOwnProfile}
                  phoneUrl={phoneUrl}
                  whatsappUrl={whatsappUrl}
                />
              </section>
            )}
          </main>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <section className={surfaceCardClass}>
              <p className="text-xs uppercase tracking-[0.04em] text-slate-500 mb-1">Service price</p>
              <p className="text-3xl font-semibold text-slate-900 mb-4">
                {priceType === "quote" ? "Custom Quote" : formatServicePrice(price)}
                {priceType === "hourly" && <span className="text-sm font-medium text-slate-400 ml-1">/hr</span>}
              </p>

              {!isOwnProfile && (
                <Link
                  href={`/services/provider/${provider.id}/request?service=${serviceId}`}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-teal-600 text-white font-semibold text-sm rounded-xl hover:bg-teal-700 transition-colors"
                >
                  Request
                </Link>
              )}

              <div className="mt-2.5 space-y-2.5">
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 border border-slate-300 text-slate-800 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <FaWhatsapp className="w-4 h-4" />
                    WhatsApp
                  </a>
                )}
                {phoneUrl && (
                  <a
                    href={phoneUrl}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 border border-slate-300 text-slate-800 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    Call
                  </a>
                )}
              </div>

              <p className="text-xs text-slate-400 text-center mt-3">Free to contact · No obligation</p>
            </section>

            {(provider.response_time_minutes != null || serviceAreas.length > 0) && (
              <section className={surfaceCardClass}>
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Why this listing is trustworthy</h3>
                <ul className="space-y-2.5 text-sm text-slate-600">
                  {provider.response_time_minutes != null && (
                    <li className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-slate-500 mt-0.5" />
                      <span>Typical response: {getResponseTimeLabel(provider.response_time_minutes)}.</span>
                    </li>
                  )}
                  {serviceAreas.length > 0 && (
                    <li className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
                      <span>Serves {serviceAreas.length} area{serviceAreas.length !== 1 ? "s" : ""} around {serviceAreas[0]}.</span>
                    </li>
                  )}
                </ul>
              </section>
            )}
          </aside>
        </div>
      </div>

      {/* ─── Mobile CTA Bar ─── */}
      {!isOwnProfile && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 z-40">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900">{priceDisplay}</p>
              <p className="text-xs text-slate-500 truncate">{serviceName}</p>
            </div>
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
                Contact
              </a>
            )}
            <Link
              href={`/services/provider/${provider.id}/request?service=${serviceId}`}
              className="px-6 py-3 bg-teal-600 text-white font-semibold text-sm rounded-lg hover:bg-teal-700 transition-colors flex-shrink-0"
            >
              Request
            </Link>
          </div>
        </div>
      )}
      {!isOwnProfile && <div className="lg:hidden h-20" />}
    </div>
  );
}
