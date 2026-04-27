/**
 * Unavailable Listing Modal
 * 
 * Shown when a user's saved listing becomes unavailable (rented/paused/archived).
 * Captures leads by offering:
 * 1. Notification when THIS listing becomes available again (waitlist)
 * 2. Alerts for SIMILAR listings in the same area
 * 3. Display of similar available listings
 * 
 * This is a HIGH-VALUE lead capture moment - the user had intent for a specific property.
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { 
  X, 
  Bell, 
  Mail, 
  Loader2,
  CheckCircle,
  AlertCircle,
  Home,
  MapPin,
  Clock,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

interface UnavailableListing {
  id: string;
  title: string;
  area: string;
  city: string;
  property_type: string;
  bedrooms?: number;
  rent_amount: number;
  currency?: string;
  cover_photo?: string | null;
  status: "rented" | "paused" | "archived";
}

interface SimilarListing {
  id: string;
  title: string;
  area: string;
  rent_amount: number;
  currency?: string;
  cover_photo?: string | null;
  bedrooms?: number;
}

interface UnavailableListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: UnavailableListing;
  similarListings?: SimilarListing[];
  // User info (if logged in)
  isAuthenticated?: boolean;
  userId?: string;
  userEmail?: string;
  userPhone?: string;
}

// Phone number validation for Kenya
function validateKenyanPhone(phone: string): boolean {
  if (!phone) return true;
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length !== 9) return false;
  return cleaned.startsWith("7") || cleaned.startsWith("1");
}

// Format phone for display
function formatPhone(value: string): string {
  const cleaned = value.replace(/\D/g, "").slice(0, 9);
  const parts = [];
  if (cleaned.length > 0) parts.push(cleaned.slice(0, 3));
  if (cleaned.length > 3) parts.push(cleaned.slice(3, 6));
  if (cleaned.length > 6) parts.push(cleaned.slice(6, 9));
  return parts.join(" ");
}

// Format price
function formatPrice(amount: number, currency = "KES"): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Status messages
function getStatusMessage(status: string): { title: string; description: string; icon: "rented" | "paused" } {
  switch (status) {
    case "rented":
      return {
        title: "This property has been rented",
        description: "Someone else got there first, but don't worry - we can help you find similar options.",
        icon: "rented",
      };
    case "paused":
      return {
        title: "This property is temporarily unavailable",
        description: "The landlord has paused this listing. It may become available again soon.",
        icon: "paused",
      };
    case "archived":
      return {
        title: "This listing has been removed",
        description: "The landlord has taken down this listing, but we have similar properties.",
        icon: "rented",
      };
    default:
      return {
        title: "This property is no longer available",
        description: "But we can notify you when similar properties become available.",
        icon: "rented",
      };
  }
}

export function UnavailableListingModal({
  isOpen,
  onClose,
  listing,
  similarListings = [],
  isAuthenticated = false,
  userId,
  userEmail,
  userPhone,
}: UnavailableListingModalProps) {
  const [activeTab, setActiveTab] = useState<"waitlist" | "similar">(
    listing.status === "paused" ? "waitlist" : "similar"
  );
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [wantsSimilar, setWantsSimilar] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Pre-fill from user profile
  useEffect(() => {
    if (isOpen) {
      setEmail(userEmail || "");
      setPhone(userPhone ? formatPhone(userPhone.replace("+254", "")) : "");
      setIsSuccess(false);
      setError(null);
    }
  }, [isOpen, userEmail, userPhone]);

  // Focus email input when modal opens
  useEffect(() => {
    if (isOpen && !isAuthenticated && emailInputRef.current) {
      setTimeout(() => emailInputRef.current?.focus(), 100);
    }
  }, [isOpen, isAuthenticated]);

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!email || !email.trim()) {
      setError("Please enter your email address");
      return;
    }
    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    if (phone && !validateKenyanPhone(phone)) {
      setError("Please enter a valid phone number");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formattedPhone = phone ? `+254${phone.replace(/\D/g, "")}` : null;

      // 1. Add to waitlist for THIS specific listing (if paused)
      if (listing.status === "paused") {
        const waitlistResponse = await fetch("/api/listing-waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listing_id: listing.id,
            email: email.trim(),
            phone: formattedPhone,
            user_id: userId || null,
          }),
        });

        if (!waitlistResponse.ok) {
          const data = await waitlistResponse.json();
          // Ignore duplicate entry errors
          if (!data.error?.includes("already")) {
            throw new Error(data.error || "Failed to join waitlist");
          }
        }
      }

      // 2. Create alert for SIMILAR listings (if checkbox is checked or listing is rented)
      if (wantsSimilar || listing.status === "rented") {
        const alertResponse = await fetch("/api/search-alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            phone: formattedPhone,
            name: `Similar to ${listing.title}`,
            frequency: "instant",
            notify_email: true,
            notify_sms: !!formattedPhone,
            // Search criteria based on the unavailable listing
            areas: [listing.area],
            property_types: [listing.property_type],
            bedrooms_min: listing.bedrooms ? listing.bedrooms : undefined,
            bedrooms_max: listing.bedrooms ? listing.bedrooms + 1 : undefined,
            price_min: Math.floor(listing.rent_amount * 0.8),
            price_max: Math.ceil(listing.rent_amount * 1.2),
            // Source tracking
            source: "unavailable_listing",
            source_listing_id: listing.id,
            user_id: userId || null,
          }),
        });

        if (!alertResponse.ok) {
          const data = await alertResponse.json();
          throw new Error(data.error || "Failed to create alert");
        }
      }

      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const statusInfo = getStatusMessage(listing.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-fade-in-up max-h-[90vh] flex flex-col">
        {/* Header with listing preview */}
        <div className="relative bg-gray-900 text-white p-4">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex gap-4">
            {/* Listing thumbnail */}
            <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-700">
              {listing.cover_photo ? (
                <Image
                  src={listing.cover_photo}
                  alt={listing.title}
                  fill
                  className="object-cover opacity-60"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Home className="w-8 h-8 text-gray-500" />
                </div>
              )}
              {/* Status badge */}
              <div className={cn(
                "absolute inset-0 flex items-center justify-center",
                listing.status === "rented" ? "bg-red-500/80" : "bg-yellow-500/80"
              )}>
                {listing.status === "rented" ? (
                  <span className="text-xs font-bold">RENTED</span>
                ) : (
                  <Clock className="w-5 h-5" />
                )}
              </div>
            </div>
            
            {/* Listing info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{listing.title}</h3>
              <p className="text-sm text-gray-300 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {listing.area}, {listing.city}
              </p>
              <p className="text-lg font-bold mt-1">
                {formatPrice(listing.rent_amount, listing.currency)}
                <span className="text-sm font-normal text-gray-300">/mo</span>
              </p>
            </div>
          </div>
        </div>

        {/* Status message */}
        <div className="px-4 py-3 bg-gray-50 border-b">
          <p className="font-medium text-gray-900">{statusInfo.title}</p>
          <p className="text-sm text-gray-600">{statusInfo.description}</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isSuccess ? (
            /* Success State */
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                You&apos;re on the list!
              </h3>
              <p className="text-gray-600 mb-6 max-w-xs mx-auto">
                {listing.status === "paused" 
                  ? "We'll notify you when this property becomes available again."
                  : "We'll notify you when similar properties become available."
                }
              </p>
              
              {/* Similar listings CTA */}
              {similarListings.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 text-left">
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    In the meantime, check out these similar properties:
                  </p>
                  <div className="space-y-2">
                    {similarListings.slice(0, 3).map((similar) => (
                      <Link
                        key={similar.id}
                        href={`/listings/${similar.id}`}
                        onClick={onClose}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-white transition-colors"
                      >
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                          {similar.cover_photo ? (
                            <Image
                              src={similar.cover_photo}
                              alt={similar.title}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Home className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{similar.title}</p>
                          <p className="text-sm text-gray-600">
                            {formatPrice(similar.rent_amount, similar.currency)}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              
              <button
                onClick={onClose}
                className="mt-6 bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 px-8 rounded-xl transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            /* Lead Capture Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Tabs for paused listings */}
              {listing.status === "paused" && (
                <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setActiveTab("waitlist")}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors",
                      activeTab === "waitlist"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    <Clock className="w-4 h-4 inline mr-1" />
                    Notify when available
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("similar")}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors",
                      activeTab === "similar"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    <Home className="w-4 h-4 inline mr-1" />
                    Find similar
                  </button>
                </div>
              )}

              {/* Form description */}
              <div className="text-sm text-gray-600">
                {listing.status === "paused" && activeTab === "waitlist" ? (
                  <p>Enter your details and we&apos;ll notify you the moment this property becomes available again.</p>
                ) : (
                  <p>Get notified when similar {listing.bedrooms ? `${listing.bedrooms} bedroom` : ""} properties in <strong>{listing.area}</strong> become available.</p>
                )}
              </div>

              {/* Email field */}
              <div>
                <label htmlFor="unavail-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    ref={emailInputRef}
                    id="unavail-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                    placeholder="you@email.com"
                    required
                  />
                </div>
              </div>

              {/* Phone field (optional) */}
              <div>
                <label htmlFor="unavail-phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone <span className="text-gray-400">(optional, for SMS)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
                    +254
                  </span>
                  <input
                    id="unavail-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    className="w-full pl-14 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                    placeholder="712 345 678"
                  />
                </div>
              </div>

              {/* Also notify about similar (only for waitlist tab) */}
              {listing.status === "paused" && activeTab === "waitlist" && (
                <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={wantsSimilar}
                    onChange={(e) => setWantsSimilar(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Also notify me about similar properties</p>
                    <p className="text-xs text-gray-500">In case this one doesn&apos;t become available</p>
                  </div>
                </label>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  "w-full py-4 rounded-xl font-semibold text-white transition-all",
                  "flex items-center justify-center gap-2",
                  "bg-gray-900 hover:bg-gray-800",
                  "disabled:bg-gray-300"
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Bell className="w-5 h-5" />
                    Notify Me
                  </>
                )}
              </button>

              <p className="text-xs text-center text-gray-500">
                We respect your privacy. Unsubscribe anytime.
              </p>
            </form>
          )}
        </div>

        {/* Similar listings preview (when not in success state) */}
        {!isSuccess && similarListings.length > 0 && (
          <div className="border-t bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase mb-3">Similar Available Properties</p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {similarListings.slice(0, 4).map((similar) => (
                <Link
                  key={similar.id}
                  href={`/listings/${similar.id}`}
                  onClick={onClose}
                  className="flex-shrink-0 w-32 group"
                >
                  <div className="w-32 h-20 rounded-lg overflow-hidden bg-gray-200 mb-2">
                    {similar.cover_photo ? (
                      <Image
                        src={similar.cover_photo}
                        alt={similar.title}
                        width={128}
                        height={80}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Home className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-medium text-gray-900 truncate">{similar.area}</p>
                  <p className="text-xs text-gray-600">{formatPrice(similar.rent_amount)}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UnavailableListingModal;
