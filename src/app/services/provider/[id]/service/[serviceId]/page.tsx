import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, Phone, Star } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { Footer } from "@/components/landing/Footer";
import { HomeIcon } from "@/components/landing/HomeIcons";
import { HomeNavbar } from "@/components/landing/HomeNavbar";
import { homeFont } from "@/components/landing/home-font";
import homeStyles from "@/components/landing/HomePage.module.css";
import { ServiceImageGallery } from "@/components/services/ServiceImageGallery";
import { ShareButton } from "@/components/services/ShareButton";
import { formatRating } from "@/lib/constants";
import { getServiceListingPrice } from "@/lib/services/listing-price";
import { getProviderByIdCached } from "@/lib/services/providers";
import { siteUrl } from "@/lib/site/urls";
import { createClient } from "@/lib/supabase/server";
import { getResponseTimeLabel, type ProviderServiceWithDetails } from "@/types/service-providers";
import styles from "./service-detail.module.css";

interface PageProps {
  params: Promise<{ id: string; serviceId: string }>;
}

function getListingDetails(service: ProviderServiceWithDetails) {
  const pricing = service.custom_pricing;
  const data = pricing && typeof pricing === "object" && !Array.isArray(pricing) ? pricing : null;
  const description = service.service?.description?.trim() || "";
  const providerDescription = typeof data?.description === "string" ? data.description.trim() : "";
  const images = Array.isArray(data?.image_urls)
    ? [...new Set(data.image_urls.flatMap((url) => typeof url === "string" && url.trim() ? [url.trim()] : []))]
    : [];

  return {
    id: service.id,
    name: service.service?.name || "Service",
    category: service.service?.subcategory?.name || service.service?.subcategory?.category?.name,
    description: providerDescription || description,
    hasProviderDescription: !!providerDescription,
    generalDescription: description,
    pricing: getServiceListingPrice(pricing),
    images,
  };
}

function getReviewExcerpt(text: string) {
  if (text.length <= 190) return text;
  const end = text.lastIndexOf(" ", 190);
  return text.slice(0, end > 140 ? end : 190) + "…";
}

async function getListing(id: string, serviceId: string) {
  const { provider } = await getProviderByIdCached(id);
  const service = provider?.services.find((item) => item.id === serviceId && item.is_active);
  if (!provider || !service) return null;

  const providerPath = "/services/provider/" + provider.id;
  return {
    provider,
    listing: getListingDetails(service),
    providerPath,
    canonical: siteUrl(providerPath + "/service/" + service.id),
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id, serviceId } = await params;
  const result = await getListing(id, serviceId);
  if (!result) {
    return { title: "Service unavailable | MitaSafi", robots: { index: false } };
  }

  const { provider, listing, canonical } = result;
  const title = listing.name + " by " + provider.business_name + " | MitaSafi";
  const areas = provider.service_areas?.slice(0, 3).join(", ");
  const description = listing.description
    ? listing.description.replace(/\s+/g, " ").slice(0, 160)
    : (listing.name + " from " + provider.business_name + (areas ? " in " + areas : "") + ". See pricing and request the service on MitaSafi.").slice(0, 160);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      ...(listing.images[0] ? { images: [{ url: listing.images[0], alt: listing.name }] } : {}),
    },
  };
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { id, serviceId } = await params;
  const result = await getListing(id, serviceId);
  if (!result) notFound();

  const { provider, listing, providerPath, canonical } = result;
  const supabase = await createClient();
  const [{ data: { user } }, { data: writtenReviews }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("reviews")
      .select("title, review_text")
      .eq("provider_id", provider.id)
      .eq("is_hidden", false)
      .or("review_text.not.is.null,title.not.is.null")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);
  const isOwner = user?.id === provider.user_id;
  const requestHref = providerPath + "/request?service=" + listing.id;
  const editHref = "/dashboard/provider/services/" + listing.id + "/edit";
  const serviceAreas = provider.service_areas || [];
  const phoneUrl = provider.phone ? "tel:" + provider.phone : null;
  const whatsappNumber = (provider.whatsapp || provider.phone)?.replace(/\D/g, "");
  const whatsappUrl = whatsappNumber
    ? "https://wa.me/" + whatsappNumber + "?text=" + encodeURIComponent("Hi, I'm interested in your " + listing.name + " service on MitaSafi.")
    : null;
  const hasContact = !!(phoneUrl || whatsappUrl);
  const hasResponseTime = (provider.response_time_minutes ?? 0) > 0;
  const { type: priceType, amount: price, label: priceDisplay } = listing.pricing;
  const requestLabel = priceType === "quote_only" ? "Request a quote" : "Request service";
  const priceNote = priceType === "starting_from"
    ? "Final price depends on the job details."
    : priceType === "quote_only" ? "Review the provider’s quote before accepting." : null;
  const reviewCount = provider.total_reviews ?? 0;
  const reviewLabel = reviewCount === 1 ? "1 review" : reviewCount.toLocaleString("en-KE") + " reviews";
  const reviewExcerpts = (writtenReviews ?? []).flatMap((review) => {
    const text = review.review_text?.trim() || review.title?.trim();
    return text ? [getReviewExcerpt(text.replace(/\s+/g, " "))] : [];
  }).slice(0, 2);
  const [firstReview, secondReview] = reviewExcerpts;
  const otherServices = provider.services
    .filter((service) => service.is_active && service.id !== listing.id)
    .map(getListingDetails);
  const generalDescription = listing.generalDescription && listing.generalDescription !== listing.description
    ? listing.generalDescription
    : null;

  const priceSpecification = priceType === "starting_from"
    ? { "@type": "PriceSpecification", minPrice: price, priceCurrency: "KES" }
    : priceType === "hourly" || priceType === "per_sqm"
      ? {
          "@type": "UnitPriceSpecification",
          price,
          priceCurrency: "KES",
          unitText: priceType === "hourly" ? "hour" : "square metre",
        }
      : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: listing.name,
    url: canonical,
    description: listing.description || listing.name + " by " + provider.business_name,
    ...(listing.category ? { serviceType: listing.category } : {}),
    ...(listing.images.length ? { image: listing.images.map((url) => url.startsWith("/") ? siteUrl(url) : url) } : {}),
    provider: {
      "@type": "LocalBusiness",
      name: provider.business_name,
      url: siteUrl(providerPath),
    },
    ...(price !== null ? {
      offers: {
        "@type": "Offer",
        url: canonical,
        ...(priceSpecification ? { priceSpecification } : { price, priceCurrency: "KES" }),
      },
    } : {}),
    areaServed: serviceAreas.map((area) => ({ "@type": "Place", name: area })),
  };

  return (
    <div className={[homeFont.variable, homeStyles.home, styles.page, !isOwner && styles.withDock].filter(Boolean).join(" ")}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <a className={homeStyles.skipLink} href="#service-content">Skip to service details</a>
      <HomeNavbar activePage="services" />

      <main id="service-content" tabIndex={-1} className={styles.wrap}>
        <div className={styles.returnRow}>
          <Link href={providerPath} className={styles.utility}>
            <ChevronLeft size={18} aria-hidden="true" /> Provider profile
          </Link>
          <ShareButton title={listing.name} text={listing.name + " by " + provider.business_name}
            url={canonical} itemLabel="service" className={styles.utility} />
        </div>

        {listing.images.length > 0 && (
          <ServiceImageGallery key={listing.id} images={listing.images} title={listing.name} />
        )}

        <div className={styles.layout}>
          <div className={styles.content}>
            <header className={styles.intro}>
              <h1>{listing.name}</h1>
              <div className={styles.summaryLine}>
                <Link className={styles.providerName} href={providerPath}>{provider.business_name}</Link>
                {provider.is_verified && (
                  <span className={styles.verified}><HomeIcon name="shield" size={17} /> Verified provider</span>
                )}
              </div>
              <div className={styles.summaryLine}>
                {reviewCount > 0 && (
                  <a href="#service-provider-reviews" className={styles.rating}>
                    {provider.average_rating == null ? (
                      <span>{reviewLabel}</span>
                    ) : (
                      <>
                        <Star size={16} aria-hidden="true" />
                        <strong>{formatRating(provider.average_rating)}<span className="sr-only"> out of 5</span></strong>
                        <span>({reviewLabel})</span>
                      </>
                    )}
                    <span className="sr-only"> for this provider</span>
                  </a>
                )}
                {serviceAreas.length > 0 && (
                  <p className={styles.area}><HomeIcon name="pin" size={17} /> <span>{serviceAreas.slice(0, 3).join(", ")}</span></p>
                )}
              </div>
              {serviceAreas.length > 3 && (
                <details className={styles.disclosure}>
                  <summary>{serviceAreas.length - 3} more {serviceAreas.length === 4 ? "area" : "areas"} <ChevronDown size={16} aria-hidden="true" /></summary>
                  <p className={styles.response}>{serviceAreas.slice(3).join(", ")}</p>
                </details>
              )}
            </header>

            {listing.description && (
              <section className={styles.section} aria-labelledby="service-description">
                <h2 id="service-description">{listing.hasProviderDescription ? "What’s included" : "About this service"}</h2>
                <p className={styles.bodyText}>{listing.description}</p>
                {generalDescription && (
                  <details className={styles.disclosure}>
                    <summary>Read more about this service <ChevronDown size={16} aria-hidden="true" /></summary>
                    <p className={styles.bodyText}>{generalDescription}</p>
                  </details>
                )}
              </section>
            )}

            <section className={styles.section} id="service-provider-reviews" aria-labelledby="provider-reviews-title">
              <h2 id="provider-reviews-title">Provider reviews</h2>
              {firstReview && <blockquote className={styles.quote}><p>“{firstReview}”</p></blockquote>}
              {secondReview && (
                <details className={styles.disclosure}>
                  <summary>Read another review <ChevronDown size={16} aria-hidden="true" /></summary>
                  <blockquote className={styles.quote}><p>“{secondReview}”</p></blockquote>
                </details>
              )}
              {(reviewCount > 0 || firstReview) ? (
                <Link href={providerPath + "#reviews-section"} className={styles.utility}>
                  View all provider reviews <ChevronRight size={16} aria-hidden="true" />
                </Link>
              ) : <p className={styles.response}>No reviews yet.</p>}
            </section>
          </div>

          <aside className={styles.booking} aria-label="Price and contact" data-contact={hasContact || hasResponseTime}>
            <div className={styles.priceBlock}>
              <p className={styles.price}>{priceDisplay}</p>
              {priceNote && <p className={styles.response}>{priceNote}</p>}
            </div>
            {isOwner ? (
              <Link className={styles.editLink} href={editHref}>Edit service <HomeIcon name="arrow" size={16} /></Link>
            ) : (
              <div className={styles.desktopAction}>
                <Link className={styles.request} href={requestHref} aria-describedby={!user ? "service-sign-in-desktop" : undefined}>
                  {requestLabel} <HomeIcon name="arrow" size={18} />
                </Link>
                {!user && <p id="service-sign-in-desktop" className={styles.response}>Sign in to send your request.</p>}
              </div>
            )}
            {hasContact && (
              <div className={styles.contact}>
                {whatsappUrl && (
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"><FaWhatsapp size={17} aria-hidden="true" /> WhatsApp</a>
                )}
                {phoneUrl && <a href={phoneUrl}><Phone size={15} aria-hidden="true" /> Call</a>}
              </div>
            )}
            {hasResponseTime && <p className={styles.response}>{getResponseTimeLabel(provider.response_time_minutes)}</p>}
          </aside>
        </div>

        {otherServices.length > 0 && (
          <section className={`${styles.section} ${styles.related}`} aria-labelledby="other-services-heading">
            <h2 id="other-services-heading">More from {provider.business_name}</h2>
            <ul className={styles.otherServices} role="list">
              {otherServices.map((service) => (
                <li key={service.id}>
                  <Link href={providerPath + "/service/" + service.id} prefetch={false}>
                    <span>
                      <strong>{service.name}</strong>
                      <span>{service.pricing.label}</span>
                    </span>
                    <ChevronRight size={17} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      {!isOwner && (
        <div className={styles.dock} role="group" aria-label="Service request">
          <div>
            <p className={styles.dockPrice}>{priceDisplay}</p>
            {priceNote && <p className={styles.response}>{priceNote}</p>}
          </div>
          <div className={styles.dockAction}>
            <Link className={styles.request} href={requestHref} aria-describedby={!user ? "service-sign-in-mobile" : undefined}>
              {requestLabel} <HomeIcon name="arrow" size={17} />
            </Link>
            {!user && <p id="service-sign-in-mobile" className={styles.response}>Sign in to send</p>}
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}
