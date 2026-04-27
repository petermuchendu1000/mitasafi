/**
 * Low Inventory Banner Component
 * 
 * Shows when search results are limited (< 5 properties).
 * Clean, factual messaging - no manufactured urgency.
 * 
 * UX Principles:
 * - Factual, not promotional
 * - Plain language (no idioms like "snapped up")
 * - Clear benefit (get notified)
 * - Minimal UI (no gradients or decorations)
 */

"use client";

import { useState } from "react";
import { Bell, X } from "lucide-react";
import { SearchAlertModal } from "@/components/listings/SearchAlertModal";
import { useToast } from "@/components/ui/Toast";
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
}

interface LowInventoryBannerProps {
  resultCount: number;
  searchCriteria: SearchCriteria;
  areaName?: string;
  // User info
  isAuthenticated?: boolean;
  userId?: string;
  userEmail?: string;
  userPhone?: string;
  // Customization
  threshold?: number; // Show banner when results < threshold (default: 5)
  className?: string;
}

export function LowInventoryBanner({
  resultCount,
  searchCriteria,
  areaName,
  isAuthenticated = false,
  userId,
  userEmail,
  userPhone,
  threshold = 5,
  className,
}: LowInventoryBannerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { success } = useToast();

  const handleSuccess = () => {
    success("You'll be notified when new listings match");
  };

  // Don't show if above threshold or dismissed
  if (resultCount >= threshold || resultCount === 0 || dismissed) {
    return null;
  }

  return (
    <>
      <div className={cn(
        "relative flex items-center justify-between gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg mb-6",
        className
      )}>
        {/* Message */}
        <p className="text-sm text-gray-700">
          Only <span className="font-medium text-gray-900">{resultCount}</span> {resultCount === 1 ? "property matches" : "properties match"} your search.
          {" "}
          <span className="text-gray-500">Get notified when more are listed.</span>
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-md transition-colors"
          >
            <Bell className="w-3.5 h-3.5" />
            Notify Me
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Alert Modal */}
      <SearchAlertModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSuccess}
        searchCriteria={searchCriteria}
        isAuthenticated={isAuthenticated}
        userId={userId}
        userEmail={userEmail}
        userPhone={userPhone}
      />
    </>
  );
}

export default LowInventoryBanner;
