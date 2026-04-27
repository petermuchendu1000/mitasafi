/**
 * Inquiry Modal Component (v2 - Engagement First)
 * 
 * Modal for contacting landlord that works for EVERYONE:
 * - Public users: Show contact form (name, email/phone, message)
 * - Logged-in users: Pre-fill from profile, link inquiry to account
 * 
 * NO LOGIN REQUIRED to contact a landlord.
 * Lead capture happens naturally through the form.
 * 
 * Theme: 70% Teal, 30% Orange (submit button in orange)
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { 
  X, 
  MessageCircle, 
  Calendar,
  Send,
  Loader2,
  CheckCircle,
  Mail,
  User as UserIcon,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

interface InquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle: string;
  listingArea: string;
  landlordName: string | null;
  landlordId: string;
  propertyId?: string;
  // User info (if logged in)
  isAuthenticated?: boolean;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
}

interface InquiryFormData {
  name: string;
  email: string;
  phone: string;
  message: string;
  requestViewing: boolean;
  preferredTime: string;
  preferredDay: string;
}

// Phone number validation for Kenya
function validateKenyanPhone(phone: string): boolean {
  if (!phone) return true; // Optional if email provided
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

export function InquiryModal({
  isOpen,
  onClose,
  listingId,
  listingTitle,
  listingArea,
  landlordName,
  landlordId,
  propertyId,
  isAuthenticated = false,
  userId,
  userName,
  userEmail,
  userPhone,
}: InquiryModalProps) {
  const [formData, setFormData] = useState<InquiryFormData>({
    name: "",
    email: "",
    phone: "",
    message: "",
    requestViewing: false,
    preferredTime: "morning",
    preferredDay: "weekday",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  
  const nameInputRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  // Pre-fill for logged-in users and generate default message
  useEffect(() => {
    if (isOpen) {
      const defaultMessage = `Hi${landlordName ? ` ${landlordName.split(" ")[0]}` : ""},\n\nI'm interested in the ${listingTitle} in ${listingArea}. Is it still available?\n\nPlease let me know when I can view it.\n\nThank you!`;
      
      setFormData(prev => ({
        ...prev,
        name: userName || prev.name,
        email: userEmail || prev.email,
        phone: userPhone ? formatPhone(userPhone.replace("+254", "")) : prev.phone,
        message: prev.message || defaultMessage,
      }));
    }
  }, [isOpen, userName, userEmail, userPhone, landlordName, listingTitle, listingArea]);

  // Focus appropriate input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (isAuthenticated && messageRef.current) {
          messageRef.current.focus();
        } else if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen, isAuthenticated]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsSuccess(false);
      setError(null);
      setTouched({});
    }
  }, [isOpen]);

  // Prevent body scroll when modal is open
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

  // Validation
  const validateForm = (): string | null => {
    // Phone is REQUIRED
    if (!formData.phone?.trim()) {
      return "Please enter your phone number";
    }
    if (!validateKenyanPhone(formData.phone)) {
      return "Please enter a valid phone number (e.g., 712 345 678)";
    }
    // Email is optional but must be valid if provided
    if (formData.email?.trim() && !formData.email.includes("@")) {
      return "Please enter a valid email address";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Format phone with country code if provided
      const formattedPhone = formData.phone 
        ? `+254${formData.phone.replace(/\D/g, "")}`
        : null;

      const requestBody = {
        listing_id: listingId,
        landlord_id: landlordId,
        property_id: propertyId,
        // Contact info
        name: formData.name.trim(),
        email: formData.email || null,
        phone: formattedPhone,
        // Message
        message: formData.message.trim(),
        request_viewing: formData.requestViewing,
        preferred_viewing_time: formData.requestViewing ? formData.preferredTime : null,
        preferred_viewing_day: formData.requestViewing ? formData.preferredDay : null,
        // User ID if logged in
        user_id: userId || null,
      };
      
      console.log("[InquiryModal] Sending request:", requestBody);

      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send inquiry");
      }

      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-hidden shadow-xl animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Contact Landlord</h2>
              <p className="text-sm text-gray-500 truncate max-w-[200px]">{listingTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {isSuccess ? (
            /* Success State */
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-success-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-success-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Message Sent!
              </h3>
              <p className="text-gray-600 mb-6 max-w-xs mx-auto">
                The landlord will receive your inquiry and typically responds within 24 hours
              </p>
              
              {!isAuthenticated && (
                <div className="bg-brand-50 rounded-xl p-4 mb-6 text-left">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-brand-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-brand-900 text-sm">Create a free account</p>
                      <p className="text-brand-700 text-xs mt-1">
                        Track your inquiries, save listings, and get notified when similar homes are available.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <button
                onClick={onClose}
                className="bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-8 rounded-xl transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            /* Inquiry Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Contact Info Section */}
              {!isAuthenticated && (
                <div className="space-y-3">
                  {/* Name */}
                  <div>
                    <label htmlFor="inquiry-name" className="block text-sm font-medium text-gray-700 mb-1">
                      Your Name <span className="text-gray-400 text-xs font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        ref={nameInputRef}
                        id="inquiry-name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
                        className={cn(
                          "w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500",
                          touched.name && !formData.name.trim() ? "border-error-300" : "border-gray-200"
                        )}
                        placeholder="John Doe"
                      />
                    </div>
                  </div>

                  {/* Email & Phone Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Email */}
                    <div>
                      <label htmlFor="inquiry-email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-gray-400">(optional)</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          id="inquiry-email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                          placeholder="you@email.com"
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div>
                      <label htmlFor="inquiry-phone" className="block text-sm font-medium text-gray-700 mb-1">
                        Phone <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
                          +254
                        </span>
                        <input
                          id="inquiry-phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: formatPhone(e.target.value) }))}
                          className="w-full pl-14 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                          placeholder="712 345 678"
                        />
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    We'll share your phone with the landlord so they can reach you
                  </p>
                </div>
              )}

              {/* Logged-in user info display */}
              {isAuthenticated && userName && (
                <div className="flex items-center gap-3 p-3 bg-brand-50 rounded-xl">
                  <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-brand-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{userName}</p>
                    <p className="text-sm text-gray-500">{userEmail || userPhone}</p>
                  </div>
                </div>
              )}

              {/* Message */}
              <div>
                <label htmlFor="inquiry-message" className="block text-sm font-medium text-gray-700 mb-1">
                  Your Message <span className="text-gray-400 text-xs font-normal">(optional)</span>
                </label>
                <textarea
                  ref={messageRef}
                  id="inquiry-message"
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none text-gray-900 placeholder-gray-400"
                  placeholder="Write your message..."
                />
              </div>

              {/* Viewing Request */}
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.requestViewing}
                    onChange={(e) => setFormData(prev => ({ ...prev, requestViewing: e.target.checked }))}
                    className="mt-0.5 w-5 h-5 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                  />
                  <div>
                    <span className="font-medium text-gray-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-brand-600" />
                      Request a viewing
                    </span>
                    <span className="text-sm text-gray-500">I&apos;d like to schedule a visit</span>
                  </div>
                </label>

                {/* Viewing Preferences */}
                {formData.requestViewing && (
                  <div className="pl-8 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Preferred Time
                      </label>
                      <select
                        value={formData.preferredTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, preferredTime: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                      >
                        <option value="morning">Morning (9am-12pm)</option>
                        <option value="afternoon">Afternoon (12pm-5pm)</option>
                        <option value="evening">Evening (5pm-7pm)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Preferred Day
                      </label>
                      <select
                        value={formData.preferredDay}
                        onChange={(e) => setFormData(prev => ({ ...prev, preferredDay: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                      >
                        <option value="weekday">Weekday</option>
                        <option value="weekend">Weekend</option>
                        <option value="any">Any day</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-error-50 text-error-700 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-cta-500 to-cta-600 hover:from-cta-600 hover:to-cta-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Message
                  </>
                )}
              </button>

              {/* Privacy Note */}
              <p className="text-xs text-center text-gray-500">
                Your contact info is shared only with the landlord
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default InquiryModal;
