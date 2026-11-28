/**
 * Provider Service Cards — "Services by this provider"
 *
 * Clean card per service:
 * - 16:9 image(s) with carousel
 * - Service name (bold)
 * - Service overview (full text, max 80 chars enforced at creation)
 * - Call button
 */

"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Wrench } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { MdCall } from "react-icons/md";
import { cn } from "@/lib/utils";
import { formatServicePrice } from "@/lib/constants";
import { HomeIcon } from "@/components/landing/HomeIcons";
import styles from "./profile-services.module.css";

// =============================================================================
// TYPES
// =============================================================================

export interface ProviderServiceItem {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  priceType: string;
  price: number | null;
  description: string;
  imageUrls: string[];
}

interface ProviderServiceCardsProps {
  services: ProviderServiceItem[];
  providerId: string;
  isOwnProfile: boolean;
  /** Provider phone number for call button */
  phoneUrl: string | null;
  /** WhatsApp deep link */
  whatsappUrl: string | null;
  profileLayout?: boolean;
}

// =============================================================================
// IMAGE CAROUSEL (per card) — 16:9
// =============================================================================

function CardImageCarousel({
  images,
  serviceName,
  profileLayout = false,
  eager = false,
}: {
  images: string[];
  serviceName: string;
  profileLayout?: boolean;
  eager?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [errorIndexes, setErrorIndexes] = useState<Set<number>>(new Set());

  const validImages = images.filter((_, i) => !errorIndexes.has(i));

  const prev = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIndex((i) => (i === 0 ? validImages.length - 1 : i - 1));
    },
    [validImages.length]
  );

  const next = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIndex((i) => (i === validImages.length - 1 ? 0 : i + 1));
    },
    [validImages.length]
  );

  if (validImages.length === 0) {
    if (profileLayout) return null;
    return (
      <div className="aspect-video bg-gray-100 flex items-center justify-center">
        <Wrench className="w-10 h-10 text-gray-300" />
      </div>
    );
  }

  return (
    <div className={profileLayout ? styles.media : "relative aspect-video bg-gray-100 group/carousel overflow-hidden"}>
      <Image
        src={validImages[index]}
        alt={`${serviceName} – image ${index + 1}`}
        fill
        unoptimized={validImages[index].startsWith("/images/services-landing/optimized/")}
        loading={eager ? "eager" : undefined}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className={profileLayout ? "object-cover" : "object-cover transition-transform duration-300 group-hover/carousel:scale-105"}
        onError={() => {
          setErrorIndexes((prev) => new Set(prev).add(images.indexOf(validImages[index])));
          setIndex(0);
        }}
      />

      {validImages.length > 1 && (profileLayout ? (
        <div className={styles.photoControls} role="group" aria-label={serviceName + " photos"}>
          <button type="button" onClick={prev} aria-label="Previous image"><ChevronLeft size={18} aria-hidden="true" /></button>
          <span role="status">{index + 1}/{validImages.length}</span>
          <button type="button" onClick={next} aria-label="Next image"><ChevronRight size={18} aria-hidden="true" /></button>
        </div>
      ) : (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-4 h-4 text-gray-700" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity"
            aria-label="Next image"
          >
            <ChevronRight className="w-4 h-4 text-gray-700" />
          </button>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {validImages.slice(0, 5).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-colors",
                  i === index ? "bg-white" : "bg-white/50"
                )}
              />
            ))}
            {validImages.length > 5 && (
              <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
            )}
          </div>
        </>
      ))}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ProviderServiceCards({
  services,
  providerId,
  isOwnProfile,
  phoneUrl,
  whatsappUrl,
  profileLayout = false,
}: ProviderServiceCardsProps) {
  if (services.length === 0) return null;

  const formatOverview = (value: string) => {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (normalized.length <= 80) return normalized;
    return `${normalized.slice(0, 80).trimEnd()}…`;
  };

  if (profileLayout) {
    const mixedPhotos = services.some((service) => service.imageUrls.length > 0) &&
      services.some((service) => service.imageUrls.length === 0);

    return (
      <ul className={styles.grid} data-mixed={mixedPhotos || undefined} role="list">
        {services.map((service, serviceIndex) => {
          const { priceType } = service;
          const price = priceType === "quote" || priceType === "quote_only"
            ? "Get Quote"
            : formatServicePrice(service.price, priceType === "hourly" || priceType === "per_sqm" ? priceType : "fixed");
          const href = isOwnProfile ? "/dashboard/provider/services" : `/services/provider/${providerId}/service/${service.id}`;

          return (
            <li key={service.id} className={styles.card}>
              <CardImageCarousel images={service.imageUrls} serviceName={service.name} profileLayout eager={serviceIndex < 2} />
              <div className={styles.body}>
                <h3><Link href={href} prefetch={false}>{service.name}</Link></h3>
                {service.description.trim() && <p className={styles.description}>{service.description}</p>}
                <div className={styles.price}>
                  <p>{price === "Get Quote" ? "Quote on request" : <>{service.priceType === "starting_from" && <span>From </span>}{price}</>}</p>
                  <HomeIcon name="arrow" size={18} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {services.map((service) => (
        <div
          key={service.id}
          className="group rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow bg-white flex flex-col"
        >
          {/* Clickable area → service detail */}
          <Link
            href={
              isOwnProfile
                ? `/dashboard/provider/services`
                : `/services/provider/${providerId}/service/${service.id}`
            }
            className="flex flex-col flex-1"
          >
            {/* 16:9 Image */}
            <CardImageCarousel
              images={service.imageUrls}
              serviceName={service.name}
            />

            {/* Content */}
            <div className="p-4 flex-1 flex flex-col">
              {/* Service name */}
              <h3 className="text-sm font-semibold text-gray-900 leading-snug group-hover:text-teal-700 transition-colors mb-1">
                {service.name}
              </h3>

              {/* Service overview — truncated to 80 chars */}
              {service.description && (
                <p className="text-xs text-gray-500 leading-relaxed mb-3 min-h-[56px] line-clamp-3">
                  {formatOverview(service.description)}
                </p>
              )}

              {/* Price — pushed to bottom */}
              <div className="mt-auto pt-2 border-t border-gray-100">
                {service.priceType === "quote" ? (
                  <span className="text-sm text-gray-500 font-medium">Get quote</span>
                ) : (
                  <span className="text-sm">
                    {service.priceType === "starting_from" && (
                      <span className="text-xs text-gray-400">From </span>
                    )}
                    <span className="font-bold text-gray-900">
                      {formatServicePrice(service.price)}
                    </span>
                    {service.priceType === "hourly" && (
                      <span className="text-xs text-gray-400">/hr</span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </Link>

          {/* Call + WhatsApp buttons — outside the Link to avoid nested <a> */}
          {!isOwnProfile && (phoneUrl || whatsappUrl) && (
            <div className="px-4 pb-4 flex items-center gap-2">
              {phoneUrl && (
                <a
                  href={phoneUrl}
                  className="w-10 h-10 grid place-items-center bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Call"
                  title="Call"
                >
                  <MdCall className="w-[18px] h-[18px]" />
                </a>
              )}
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 grid place-items-center border border-teal-600 text-teal-700 rounded-lg hover:bg-teal-50 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="WhatsApp"
                  title="WhatsApp"
                >
                  <FaWhatsapp className="w-[18px] h-[18px]" />
                </a>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
