/**
 * Search Alert Modal Component
 * 
 * Clean, minimal modal for creating search alerts.
 * Works WITHOUT login - just requires email or phone.
 * 
 * Design principles:
 * - Gray for structure, brand colors used sparingly
 * - Orange (CTA) for primary action button only
 * - Teal (brand) for success checkmark and links
 * - No decorative containers or colored backgrounds
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { 
  X, 
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchCriteria {
  areas?: string[];
  propertyTypes?: string[];
  bedroomsMin?: number;
  bedroomsMax?: number;
  priceMin?: number;
  priceMax?: number;
  verifiedOnly?: boolean;
  availableNow?: boolean;
  query?: string;
}

interface SearchAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void; // Called after successful submission
  searchCriteria: SearchCriteria;
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

// Format criteria for display
function formatCriteriaLabel(criteria: SearchCriteria): string {
  if (criteria.query && criteria.query.trim()) {
    return `"${criteria.query.trim()}"`;
  }
  
  const parts: string[] = [];
  
  if (criteria.bedroomsMin) {
    parts.push(`${criteria.bedroomsMin}+ BR`);
  }
  
  if (criteria.propertyTypes && criteria.propertyTypes.length > 0) {
    const types = criteria.propertyTypes.map(t => 
      t.charAt(0).toUpperCase() + t.slice(1).toLowerCase().replace(/_/g, " ")
    );
    parts.push(types[0]);
  }
  
  if (criteria.areas && criteria.areas.length > 0) {
    parts.push(`in ${criteria.areas[0]}`);
    if (criteria.areas.length > 1) {
      parts.push(`+${criteria.areas.length - 1}`);
    }
  }
  
  return parts.length > 0 ? `"${parts.join(" ")}"` : "your search";
}

export function SearchAlertModal({
  isOpen,
  onClose,
  onSuccess,
  searchCriteria,
  isAuthenticated = false,
  userId,
  userEmail,
  userPhone,
}: SearchAlertModalProps) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [frequency, setFrequency] = useState<"instant" | "daily" | "weekly">("instant");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPhoneField, setShowPhoneField] = useState(false);
  
  const emailInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  // Determine what contact info we have
  const hasUserEmail = !!userEmail;
  const hasUserPhone = !!userPhone;
  const hasAnyContact = hasUserEmail || hasUserPhone;
  const needsContactInfo = !isAuthenticated || !hasAnyContact;
  const canAddPhone = isAuthenticated && hasUserEmail && !hasUserPhone;

  // Pre-fill from user profile
  useEffect(() => {
    if (isOpen) {
      setEmail(userEmail || "");
      setPhone(userPhone ? formatPhone(userPhone.replace("+254", "")) : "");
      setShowPhoneField(false);
      setError(null);
    }
  }, [isOpen, userEmail, userPhone]);

  // Focus email input when modal opens
  useEffect(() => {
    if (isOpen && needsContactInfo && emailInputRef.current) {
      setTimeout(() => emailInputRef.current?.focus(), 100);
    }
  }, [isOpen, needsContactInfo]);

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

    const finalEmail = needsContactInfo ? email.trim() : (userEmail || "");
    const finalPhone = needsContactInfo 
      ? (phone ? `+254${phone.replace(/\D/g, "")}` : null)
      : (showPhoneField && phone ? `+254${phone.replace(/\D/g, "")}` : userPhone || null);

    // Validation
    if (needsContactInfo) {
      const hasPhone = phone && phone.trim();
      const hasEmail = email && email.trim();
      
      if (!hasPhone && !hasEmail) {
        setError("Please enter your email or phone number");
        return;
      }
      
      if (hasPhone && !validateKenyanPhone(phone)) {
        setError("Please enter a valid phone number");
        return;
      }
      
      if (hasEmail && !email.includes("@")) {
        setError("Please enter a valid email address");
        return;
      }
    }
    
    if (showPhoneField && phone && !validateKenyanPhone(phone)) {
      setError("Please enter a valid phone number");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const notifyEmail = !!finalEmail;
      const notifySms = !!finalPhone && frequency === "instant";

      const response = await fetch("/api/search-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: finalEmail || null,
          phone: finalPhone,
          name: formatCriteriaLabel(searchCriteria).replace(/"/g, ""),
          frequency,
          notify_email: notifyEmail,
          notify_sms: notifySms,
          areas: searchCriteria.areas,
          property_types: searchCriteria.propertyTypes,
          bedrooms_min: searchCriteria.bedroomsMin,
          bedrooms_max: searchCriteria.bedroomsMax,
          price_min: searchCriteria.priceMin,
          price_max: searchCriteria.priceMax,
          verified_only: searchCriteria.verifiedOnly,
          available_now: searchCriteria.availableNow,
          user_id: userId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create alert");
      }

      // Success - close modal and notify parent
      onClose();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white w-full max-w-sm rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Get notified
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Description */}
            <p className="text-sm text-gray-600">
              We&apos;ll alert you when new listings match {formatCriteriaLabel(searchCriteria)}.
            </p>

            {/* Contact info for guests */}
            {needsContactInfo && (
              <div className="space-y-3">
                <div>
                  <label htmlFor="alert-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    ref={emailInputRef}
                    id="alert-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                    placeholder="you@email.com"
                  />
                </div>

                <div>
                  <label htmlFor="alert-phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone <span className="text-gray-400 font-normal">(optional, for SMS)</span>
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 rounded-l-md bg-gray-50 text-gray-500 text-sm">
                      +254
                    </span>
                    <input
                      id="alert-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                      placeholder="712 345 678"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Existing contact for authenticated users */}
            {isAuthenticated && !needsContactInfo && (
              <div className="space-y-3">
                <div className="text-sm">
                  <span className="text-gray-500">Notify me at: </span>
                  <span className="text-gray-900">{userEmail || userPhone}</span>
                </div>
                
                {/* Option to add phone */}
                {canAddPhone && !showPhoneField && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowPhoneField(true);
                      setTimeout(() => phoneInputRef.current?.focus(), 100);
                    }}
                    className="text-sm text-brand-600 hover:text-brand-700 transition-colors"
                  >
                    + Add phone for SMS alerts
                    </button>
                  )}
                  
                  {showPhoneField && (
                    <div>
                      <label htmlFor="alert-phone-add" className="block text-sm font-medium text-gray-700 mb-1">
                        Phone number
                      </label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 rounded-l-md bg-gray-50 text-gray-500 text-sm">
                          +254
                        </span>
                        <input
                          ref={phoneInputRef}
                          id="alert-phone-add"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(formatPhone(e.target.value))}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                          placeholder="712 345 678"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Frequency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How often?
                </label>
                <div className="flex gap-2">
                  {[
                    { value: "instant", label: "Instant" },
                    { value: "daily", label: "Daily" },
                    { value: "weekly", label: "Weekly" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFrequency(option.value as typeof frequency)}
                      className={cn(
                        "flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors",
                        frequency === option.value
                          ? "bg-gray-900 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  "w-full py-2.5 text-sm font-medium rounded-md transition-colors",
                  "bg-cta-500 hover:bg-cta-600 text-white",
                  "disabled:bg-gray-300 disabled:cursor-not-allowed"
                )}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Setting up...
                  </span>
                ) : (
                  "Notify Me"
                )}
              </button>

              <p className="text-xs text-center text-gray-400">
                You can unsubscribe anytime
              </p>
            </form>
        </div>
      </div>
    </div>
  );
}

export default SearchAlertModal;
