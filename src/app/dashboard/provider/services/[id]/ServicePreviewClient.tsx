/**
 * ServicePreviewClient — Full client-view preview of a provider's service.
 *
 * Design: Marketplace-style service detail page (Fiverr/Thumbtack inspiration)
 * - Sticky dark preview banner with back, share, edit
 * - Two-column layout: left content + right sticky sidebar
 * - Left: breadcrumb → title + trust badges → provider bar → image gallery → about → service areas → reviews
 * - Right: teal gradient price hero → Book Now CTA → WhatsApp → Call → stats grid → provider card
 * - Mobile: sidebar flows below content + sticky bottom bar
 */

"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Star,
  MapPin,
  Phone,
  Mail,
  Eye,
  EyeOff,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  Shield,
  Award,
  Calendar,
  CalendarCheck,
  MessageCircle,
  Share2,
  Zap,
  AlertTriangle,
  ShieldCheck,
  BadgeCheck,
  Bookmark,
  Timer,
  X,
} from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { getResponseTimeLabel } from "@/types/service-providers";
import { formatRating } from "@/lib/constants";
import type { ServicePreviewData } from "../actions";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatResponseTimeText(responseTime: string): string {
  const map: Record<string, string> = {
    within_1_hour: "< 1 hour",
    within_few_hours: "Few hours",
    within_24_hours: "< 24 hrs",
  };
  return map[responseTime] || responseTime.replace(/_/g, " ");
}

function formatExperienceText(experience: string): string {
  const map: Record<string, string> = {
    less_than_1: "< 1 yr",
    "1_2": "1-2 yrs",
    "3_5": "3-5 yrs",
    "5_10": "5-10 yrs",
    "10_plus": "10+ yrs",
  };
  return map[experience] || experience.replace(/_/g, " ");
}

function memberSinceLabel(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-KE", { month: "long", year: "numeric" });
}

function memberSinceShort(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-KE", { month: "short", year: "numeric" });
}

function lastActiveLabel(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 5) return "Online now";
  if (mins < 60) return `Active ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Active ${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `Active ${days}d ago`;
  return null;
}

function formatWhatsAppUrl(whatsapp: string, serviceName: string): string {
  const cleaned = whatsapp.replace(/[^+\d]/g, "");
  const msg = encodeURIComponent(
    `Hi, I'm interested in your "${serviceName}" service on MitaSafi.`
  );
  return `https://wa.me/${cleaned}?text=${msg}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface ServicePreviewClientProps {
  data: ServicePreviewData;
}

export function ServicePreviewClient({ data }: ServicePreviewClientProps) {
  const cp = data.custom_pricing as Record<string, unknown> | null;
  const imageUrls = (cp?.image_urls as string[]) || [];
  const price = cp?.amount as number | undefined;
  const priceType = cp?.type as string | undefined;
  const description = cp?.description as string | undefined;

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAllAreas, setShowAllAreas] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const MAX_VISIBLE_AREAS = 3;

  // Lightbox helpers
  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const lightboxPrev = useCallback(() => {
    setLightboxIndex(prev => (prev === 0 ? imageUrls.length - 1 : prev - 1));
  }, [imageUrls.length]);

  const lightboxNext = useCallback(() => {
    setLightboxIndex(prev => (prev === imageUrls.length - 1 ? 0 : prev + 1));
  }, [imageUrls.length]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxOpen) {
        if (e.key === "ArrowLeft") lightboxPrev();
        if (e.key === "ArrowRight") lightboxNext();
        if (e.key === "Escape") setLightboxOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, lightboxPrev, lightboxNext]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [lightboxOpen]);

  const formatPrice = () => {
    if (priceType === "quote") return { main: "Request a Quote", sub: null };
    if (!price) return { main: "Price not set", sub: null };
    const formatted = `KES ${price.toLocaleString()}`;
    if (priceType === "starting_from")
      return { main: formatted, sub: "Starting from" };
    return { main: formatted, sub: "Fixed price" };
  };

  const priceDisplay = formatPrice();
  const activeLabel = lastActiveLabel(data.provider.last_active_at);
  const memberSince = memberSinceLabel(data.provider.member_since);
  const memberSinceCompact = memberSinceShort(data.provider.member_since);

  const handleShare = async () => {
    const url = window.location.href;
    const text = `Check out "${data.service.name}" on MitaSafi`;
    if (navigator.share) {
      try {
        await navigator.share({ title: text, url });
      } catch {
        /* cancelled */
      }
    } else {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
        "_blank"
      );
    }
  };

  // Star rating display (1-5 filled stars)
  const ratingStars = (rating: number | null, size: "sm" | "md" = "sm") => {
    const r = rating ?? 0;
    const sizeClass = size === "md" ? "w-4.5 h-4.5" : "w-3.5 h-3.5";
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={cn(
              sizeClass,
              i <= Math.round(r)
                ? "text-amber-400 fill-amber-400"
                : "text-gray-200"
            )}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ── Header ── */}
      <header className="border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard/provider/services" className="text-slate-400 hover:text-slate-900 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <nav className="flex items-center gap-2 text-sm font-medium text-slate-400">
              <Link href="/dashboard/provider/services" className="hover:text-slate-600">Services</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-600">{data.service.category_name}</span>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handleShare} className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 flex items-center gap-2">
              <Share2 className="w-4 h-4" /> Share
            </button>
            <Link href={`/dashboard/provider/services/${data.id}/edit`} className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 flex items-center gap-2">
              <Pencil className="w-4 h-4" /> Edit
            </Link>
          </div>
        </div>
      </header>

      {/* ── Paused Bar ── */}
      {!data.is_active && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-6xl mx-auto px-6 py-2 flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-800 font-medium">This service is paused and not visible to clients.</span>
          </div>
        </div>
      )}

      {/* ── Main Content ── */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10">
          
          {/* ══════════ LEFT COLUMN ══════════ */}
          <div className="space-y-8">
            
            {/* Title Section */}
            <section className="space-y-3">
              {/* Title */}
              <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 leading-[1.1] tracking-tight">
                {data.service.name}
              </h1>

              {/* Rating + Location + Emergency */}
              <div className="flex items-center gap-4 text-sm">
                {data.provider.rating_average && data.provider.rating_average > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-teal-600 fill-teal-600" />
                    <span className="font-bold text-slate-900">{formatRating(data.provider.rating_average)}</span>
                    <span className="text-slate-500">({data.provider.rating_count || 0} reviews)</span>
                  </div>
                )}
                {data.provider.verification_badge && (
                  <span className="text-sm text-slate-500 capitalize">{data.provider.verification_badge} seller</span>
                )}
                {data.provider.primary_location && (
                  <div className="flex items-center gap-1 text-sm text-slate-500">
                    <MapPin className="w-4 h-4" />
                    <span>{data.provider.primary_location}</span>
                  </div>
                )}
                {data.provider.emergency_available && (
                  <span className="text-sm text-slate-500">Emergency available</span>
                )}
              </div>
            </section>

            {/* Image Gallery */}
            <section className="grid grid-cols-12 gap-3 h-[380px]">
              {imageUrls.length > 0 ? (
                <>
                  <button onClick={() => openLightbox(0)} className="col-span-8 rounded-xl overflow-hidden bg-slate-100 relative cursor-zoom-in">
                    <Image src={imageUrls[0]} alt={data.service.name} fill className="object-cover hover:scale-105 transition-transform duration-500" priority />
                  </button>
                  <div className="col-span-4 grid grid-rows-2 gap-3">
                    <button onClick={() => imageUrls[1] && openLightbox(1)} className="rounded-xl overflow-hidden bg-slate-100 relative cursor-zoom-in">
                      {imageUrls[1] ? (
                        <Image src={imageUrls[1]} alt="" fill className="object-cover hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-slate-300" /></div>
                      )}
                    </button>
                    <button onClick={() => imageUrls[2] ? openLightbox(2) : undefined} className="rounded-xl overflow-hidden bg-slate-100 relative group cursor-pointer">
                      {imageUrls[2] ? (
                        <>
                          <Image src={imageUrls[2]} alt="" fill className="object-cover" />
                          {imageUrls.length > 3 && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-white font-bold text-sm">+{imageUrls.length - 3} more</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-slate-300" /></div>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="col-span-12 rounded-xl bg-slate-50 flex flex-col items-center justify-center">
                  <ImageIcon className="w-12 h-12 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-400">No photos yet</p>
                  <Link href={`/dashboard/provider/services/${data.id}/edit`} className="text-sm text-teal-600 font-medium mt-1">Add photos →</Link>
                </div>
              )}
            </section>

            {/* About */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900">About this service</h2>
              <div className="text-slate-600 leading-relaxed">
                {description || <span className="text-slate-400 italic">No description provided. <Link href={`/dashboard/provider/services/${data.id}/edit`} className="text-teal-600 not-italic font-medium">Add one →</Link></span>}
              </div>
              {data.service.description && (
                <div className="pt-6 border-t border-slate-100">
                  <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-teal-600" />
                    What&apos;s Included
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{data.service.description}</p>
                </div>
              )}
            </section>

            {/* Service Areas */}
            {(data.provider.service_areas.length > 0 || data.provider.primary_location) && (
              <section className="space-y-3">
                <h2 className="text-xl font-bold text-slate-900">Service Areas</h2>
                <div className="flex flex-wrap gap-2">
                  {data.provider.primary_location && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 text-xs font-medium rounded-lg">
                      <MapPin className="w-3.5 h-3.5" /> Based in {data.provider.primary_location}
                    </span>
                  )}
                  {data.provider.service_areas.slice(0, showAllAreas ? undefined : MAX_VISIBLE_AREAS).map((area) => (
                    <span key={area} className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg">{area}</span>
                  ))}
                  {!showAllAreas && data.provider.service_areas.length > MAX_VISIBLE_AREAS && (
                    <button onClick={() => setShowAllAreas(true)} className="px-3 py-1.5 bg-slate-100 text-teal-600 text-xs font-semibold rounded-lg hover:bg-slate-200">
                      +{data.provider.service_areas.length - MAX_VISIBLE_AREAS} more
                    </button>
                  )}
                </div>
              </section>
            )}

            {/* Reviews */}
            <section className="pt-6 border-t border-slate-100 space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-1">Customer Reviews</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-black text-slate-900">{data.provider.rating_average ? formatRating(data.provider.rating_average) : "—"}</span>
                    <div>
                      <div className="flex text-orange-400">
                        {[1,2,3,4,5].map(i => <Star key={i} className={cn("w-4 h-4", data.provider.rating_average && i <= Math.round(data.provider.rating_average) ? "fill-current" : "text-slate-200")} />)}
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{data.provider.rating_count || 0} reviews</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center py-8 bg-slate-50 rounded-lg">
                <Star className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">
                  {(data.provider.rating_count ?? 0) === 0
                    ? "No reviews yet"
                    : `${data.provider.rating_count} review${data.provider.rating_count === 1 ? "" : "s"} — full reviews coming soon`}
                </p>
              </div>
            </section>

            {/* Mobile sidebar */}
            <section className="lg:hidden">
              <ProviderSidebar data={data} priceDisplay={priceDisplay} memberSince={memberSince} memberSinceCompact={memberSinceCompact} activeLabel={activeLabel} ratingStars={ratingStars} />
            </section>
          </div>

          {/* ══════════ RIGHT SIDEBAR ══════════ */}
          <aside className="hidden lg:block">
            <ProviderSidebar data={data} priceDisplay={priceDisplay} memberSince={memberSince} memberSinceCompact={memberSinceCompact} activeLabel={activeLabel} ratingStars={ratingStars} />
          </aside>
        </div>
      </main>

      {/* Mobile Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 z-20">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-lg font-bold text-slate-900">{priceDisplay.main}</p>
          </div>
          {data.provider.whatsapp && (
            <a href={formatWhatsAppUrl(data.provider.whatsapp, data.service.name)} target="_blank" rel="noopener noreferrer" className="px-4 py-2.5 bg-[#25D366] text-white font-bold rounded-lg text-sm flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
          )}
          <button className="px-4 py-2.5 bg-orange-500 text-white font-bold rounded-lg text-sm hover:bg-orange-600 transition-colors">Request</button>
        </div>
      </div>
      <div className="lg:hidden h-20" />

      {/* ── Image Lightbox ── */}
      {lightboxOpen && imageUrls.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setLightboxOpen(false)}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
                <span className="text-white font-medium">
                  {lightboxIndex + 1} / {imageUrls.length}
                </span>
              </div>
            </div>
          </div>

          {/* Main image */}
          <div className="absolute inset-0 flex items-center justify-center p-4 pt-20 pb-24">
            <div className="relative w-full h-full max-w-6xl">
              <Image
                src={imageUrls[lightboxIndex]}
                alt={`${data.service.name} - Photo ${lightboxIndex + 1}`}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>
          </div>

          {/* Navigation arrows */}
          {imageUrls.length > 1 && (
            <>
              <button
                onClick={lightboxPrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={lightboxNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </>
          )}

          {/* Thumbnail strip */}
          {imageUrls.length > 1 && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex justify-center gap-2 overflow-x-auto pb-2">
                {imageUrls.map((url, index) => (
                  <button
                    key={index}
                    onClick={() => setLightboxIndex(index)}
                    className={cn(
                      "relative w-16 h-12 flex-shrink-0 rounded-md overflow-hidden transition-all",
                      index === lightboxIndex
                        ? "ring-2 ring-teal-500 ring-offset-2 ring-offset-black"
                        : "opacity-60 hover:opacity-100"
                    )}
                  >
                    <Image
                      src={url}
                      alt={`Thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Price Card ──────────────────────────────────────────────────────────────

function PriceCard({
  data,
  priceDisplay,
  memberSinceCompact,
}: {
  data: ServicePreviewData;
  priceDisplay: { main: string; sub: string | null };
  memberSinceCompact: string | null;
}) {
  // Build WhatsApp URL if available
  const whatsappUrl = data.provider.whatsapp
    ? formatWhatsAppUrl(data.provider.whatsapp, data.service.name)
    : null;

  // Build tel: URL if phone available
  const phoneUrl = data.provider.phone
    ? `tel:${data.provider.phone.replace(/[^+\d]/g, "")}`
    : null;

  // Rating stars helper
  const renderStars = (rating: number | null) => {
    const r = rating ?? 0;
    const full = Math.floor(r);
    const hasHalf = r - full >= 0.5;
    const empty = 5 - full - (hasHalf ? 1 : 0);
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(full)].map((_, i) => (
          <Star key={`full-${i}`} className="w-4 h-4 text-slate-900 fill-slate-900" />
        ))}
        {hasHalf && <Star className="w-4 h-4 text-slate-900 fill-slate-900/50" />}
        {[...Array(empty)].map((_, i) => (
          <Star key={`empty-${i}`} className="w-4 h-4 text-slate-300" />
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm space-y-6">
      {/* Provider Header - Fiverr style */}
      <div className="flex items-start gap-4 pb-6 border-b border-slate-50">
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-teal-400 to-teal-600 ring-4 ring-slate-50">
            {data.provider.profile_photo_url ? (
              <Image src={data.provider.profile_photo_url} alt="" width={80} height={80} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold text-3xl">
                {(data.provider.business_name || "?").charAt(0)}
              </div>
            )}
          </div>
          {data.provider.is_verified && (
            <span className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full shadow-sm">
              <BadgeCheck className="w-5 h-5 text-teal-600 fill-teal-100" />
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          {/* Name */}
          <Link href={`/services/provider/${data.provider.id}`} className="block">
            <h3 className="font-bold text-lg text-slate-900 truncate hover:text-teal-600 transition-colors cursor-pointer">{data.provider.business_name || "Business Name"}</h3>
          </Link>
          
          {/* Rating row */}
          <div className="flex items-center gap-2">
            {renderStars(data.provider.rating_average)}
            <span className="font-bold text-sm text-slate-900">
              {data.provider.rating_average ? formatRating(data.provider.rating_average) : "—"}
            </span>
            <span className="text-sm text-slate-400">
              ({data.provider.rating_count ?? 0})
            </span>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            {data.provider.primary_location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {data.provider.primary_location}
              </span>
            )}
            {memberSinceCompact && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Joined {memberSinceCompact}
              </span>
            )}
            {data.provider.total_jobs_completed != null && data.provider.total_jobs_completed > 0 && (
              <span className="flex items-center gap-1">
                <CalendarCheck className="w-3.5 h-3.5" />
                {data.provider.total_jobs_completed} orders completed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Price + CTAs */}
      <div className="pt-2 space-y-4">
        <div className="flex items-end justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pb-0.5">Service Fee</p>
          <div className="text-right">
            {priceDisplay.sub && (
              <p className="text-[10px] text-slate-400 mb-0.5">{priceDisplay.sub}</p>
            )}
            {priceDisplay.main.startsWith("KES") ? (
              <span className="text-xl font-bold text-teal-600">
                {priceDisplay.main}
              </span>
            ) : (
              <span className="text-base font-bold text-slate-900">{priceDisplay.main}</span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {/* Request Service - Primary CTA */}
          <button
            className="w-full bg-orange-500 py-3.5 rounded-lg text-white font-bold text-sm hover:bg-orange-600 transition-all shadow-[0_4px_14px_0_rgba(234,88,12,0.25)] active:scale-[0.98]"
          >
            Request Service
          </button>

          {/* WhatsApp + Call buttons */}
          <div className="grid grid-cols-2 gap-3">
            <a
              href={whatsappUrl || "https://wa.me/"}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 border border-slate-200 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
            {phoneUrl ? (
              <a
                href={phoneUrl}
                className="w-full py-2.5 border border-slate-200 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4" />
                Call
              </a>
            ) : (
              <button 
                className="w-full py-2.5 border border-slate-200 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4" />
                Call
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Trust Indicators */}
      <ul className="space-y-3 pt-5 border-t border-slate-100">
        {(data.provider.response_time_minutes != null || data.provider.response_time) && (
          <li className="flex items-center gap-2.5 text-xs text-slate-500">
            <Timer className="w-3.5 h-3.5 text-slate-400" />
            {data.provider.response_time_minutes != null
              ? `Responds ${getResponseTimeLabel(data.provider.response_time_minutes).toLowerCase()}`
              : `Responds ${formatResponseTimeText(data.provider.response_time!).toLowerCase()}`}
          </li>
        )}
        {data.provider.is_verified && (
          <li className="flex items-center gap-2.5 text-xs text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            Verified provider
          </li>
        )}
        {data.provider.verification_badge && (
          <li className="flex items-center gap-2.5 text-xs text-slate-500">
            <Award className="w-3.5 h-3.5 text-slate-400" />
            <span className="capitalize">{data.provider.verification_badge} seller</span>
          </li>
        )}
      </ul>
    </div>
  );
}


// ─── Stats Card ──────────────────────────────────────────────────────────────

function StatsCard({
  data,
}: {
  data: ServicePreviewData;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/60 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
      <div className="px-5 py-[18px]">
        <h3 className="text-[14px] font-bold text-gray-900">Quick Stats</h3>
      </div>
      <div className="border-t border-gray-100">
        {/* Row 1 */}
        <div className="grid grid-cols-2">
          <div className="flex flex-col items-center gap-1 p-4">
            <span className="text-[22px] font-extrabold text-teal-600">
              {data.provider.rating_average ? formatRating(data.provider.rating_average) : "—"}
            </span>
            <span className="text-[11px] font-medium text-gray-400">Rating</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-4 border-l border-gray-100">
            <span className="text-[22px] font-extrabold text-teal-600">
              {data.provider.total_jobs_completed ?? "—"}
            </span>
            <span className="text-[11px] font-medium text-gray-400">Jobs Done</span>
          </div>
        </div>
        <div className="border-t border-gray-100" />
        {/* Row 2 */}
        <div className="grid grid-cols-2">
          <div className="flex flex-col items-center gap-1 p-4">
            <span className="text-[22px] font-extrabold text-emerald-600">
              {data.provider.response_time_minutes != null
                ? getResponseTimeLabel(data.provider.response_time_minutes).replace("Responds in ", "")
                : data.provider.response_time
                  ? formatResponseTimeText(data.provider.response_time)
                  : "—"}
            </span>
            <span className="text-[11px] font-medium text-gray-400">Response</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-4 border-l border-gray-100">
            <span className="text-[22px] font-extrabold text-teal-600">
              {data.experience_years
                ? `${data.experience_years} yrs`
                : data.provider.years_experience
                  ? formatExperienceText(data.provider.years_experience)
                  : data.provider.years_in_business
                    ? `${data.provider.years_in_business} yrs`
                    : "—"}
            </span>
            <span className="text-[11px] font-medium text-gray-400">Experience</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Provider Sidebar (Composition) ──────────────────────────────────────────

function ProviderSidebar({
  data,
  priceDisplay,
  memberSince,
  memberSinceCompact,
  activeLabel,
  ratingStars,
}: {
  data: ServicePreviewData;
  priceDisplay: { main: string; sub: string | null };
  memberSince: string | null;
  memberSinceCompact: string | null;
  activeLabel: string | null;
  ratingStars: (rating: number | null, size?: "sm" | "md") => React.ReactNode;
}) {
  return (
    <div className="sticky top-24 space-y-6">
      <PriceCard data={data} priceDisplay={priceDisplay} memberSinceCompact={memberSinceCompact} />
      <StatsCard data={data} />
    </div>
  );
}
