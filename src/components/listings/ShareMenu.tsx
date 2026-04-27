/**
 * Share Menu Component
 * 
 * Share button with dropdown menu for sharing listings.
 * Options: Copy Link, WhatsApp, Email to Self
 * 
 * All options work without login. Email to self captures lead.
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { Share2, Copy, Mail, MessageCircle, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

interface ShareMenuProps {
  listingId: string;
  listingTitle: string;
  listingUrl?: string;
  variant?: "icon" | "button";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ShareMenu({
  listingId,
  listingTitle,
  listingUrl,
  variant = "icon",
  size = "md",
  className,
}: ShareMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const toast = useToast();
  const menuRef = useRef<HTMLDivElement>(null);

  // Get the full URL
  const fullUrl = listingUrl || (typeof window !== "undefined" 
    ? `${window.location.origin}/listings/${listingId}`
    : `/listings/${listingId}`);

  // WhatsApp share URL
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Check out this listing on MitaSafi: ${listingTitle}\n${fullUrl}`)}`;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Link copied!", "Share it with anyone");
      setIsOpen(false);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = fullUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      toast.success("Link copied!", "Share it with anyone");
      setIsOpen(false);
    }
  };

  const handleWhatsApp = () => {
    window.open(whatsappUrl, "_blank");
    setIsOpen(false);
  };

  const handleEmailToSelf = () => {
    setShowEmailModal(true);
    setIsOpen(false);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      toast.error("Invalid email", "Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/listings/email-to-self", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          listing_id: listingId,
          listing_title: listingTitle,
          listing_url: fullUrl,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send email");
      }

      setEmailSent(true);
      setTimeout(() => {
        setShowEmailModal(false);
        setEmailSent(false);
        setEmail("");
      }, 2000);
    } catch (error) {
      toast.error("Failed to send", "Please try again later");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sizeClasses = {
    sm: { button: "w-8 h-8", icon: "w-4 h-4" },
    md: { button: "w-10 h-10", icon: "w-5 h-5" },
    lg: { button: "w-12 h-12", icon: "w-6 h-6" },
  };

  return (
    <>
      <div ref={menuRef} className={cn("relative", className)}>
        {/* Trigger Button */}
        {variant === "icon" ? (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "flex items-center justify-center rounded-full transition-all",
              "bg-white/90 backdrop-blur-sm hover:bg-white shadow-md hover:shadow-lg",
              "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2",
              sizeClasses[size].button
            )}
            aria-label="Share listing"
          >
            <Share2 className={cn(sizeClasses[size].icon, "text-gray-600")} />
          </button>
        ) : (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl transition-all",
              "bg-white border border-gray-200 text-gray-700",
              "hover:bg-gray-50 hover:border-gray-300",
              "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            )}
            aria-label="Share listing"
          >
            <Share2 className="w-5 h-5" />
            <span>Share</span>
          </button>
        )}

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 animate-fade-in">
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
            >
              <Copy className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-900">Copy Link</p>
                <p className="text-xs text-gray-500">Share anywhere</p>
              </div>
            </button>

            <button
              onClick={handleWhatsApp}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
            >
              <MessageCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-gray-900">WhatsApp</p>
                <p className="text-xs text-gray-500">Send to contacts</p>
              </div>
            </button>

            <button
              onClick={handleEmailToSelf}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
            >
              <Mail className="w-5 h-5 text-brand-600" />
              <div>
                <p className="font-medium text-gray-900">Email to Myself</p>
                <p className="text-xs text-gray-500">Save for later</p>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowEmailModal(false)}
          />
          <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-xl p-6 animate-fade-in-up">
            {emailSent ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-success-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check className="w-6 h-6 text-success-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Email Sent!</h3>
                <p className="text-sm text-gray-500 mt-1">Check your inbox</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Email this listing</h3>
                  <button
                    onClick={() => setShowEmailModal(false)}
                    className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  We&apos;ll send you the listing details so you can view it later.
                </p>

                <form onSubmit={handleEmailSubmit}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 mb-4"
                    autoFocus
                  />

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={cn(
                      "w-full py-3 rounded-xl font-semibold text-white transition-all",
                      "bg-gradient-to-r from-cta-500 to-cta-600 hover:from-cta-600 hover:to-cta-700",
                      "disabled:from-gray-300 disabled:to-gray-400",
                      "flex items-center justify-center gap-2"
                    )}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-5 h-5" />
                        Send Email
                      </>
                    )}
                  </button>
                </form>

                <p className="text-xs text-gray-500 text-center mt-3">
                  We&apos;ll only use your email to send this listing
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default ShareMenu;
