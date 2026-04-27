/**
 * Save Search Button Component
 * 
 * Prominent button for saving search criteria as an alert.
 * - One click for logged-in users (auto-saves with user email)
 * - Opens modal for guests (captures email/phone)
 * 
 * High-value lead capture at moment of intent.
 */

"use client";

import { useState, useEffect } from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import { SearchAlertModal } from "@/components/listings/SearchAlertModal";
import { useToast } from "@/components/ui";
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

interface SaveSearchButtonProps {
  searchCriteria: SearchCriteria;
  // User info (from server)
  isAuthenticated?: boolean;
  userId?: string;
  userEmail?: string;
  userPhone?: string;
  // Styling
  variant?: "default" | "compact" | "banner";
  className?: string;
  // Custom button text
  buttonText?: string;
}

// Format criteria for display - prioritize search query
function formatCriteriaLabel(criteria: SearchCriteria): string {
  // If user typed a search query, use that as the label
  if (criteria.query && criteria.query.trim()) {
    return criteria.query.trim();
  }
  
  const parts: string[] = [];
  
  if (criteria.bedroomsMin) {
    parts.push(`${criteria.bedroomsMin}+ bedroom`);
  }
  
  if (criteria.propertyTypes && criteria.propertyTypes.length > 0) {
    const types = criteria.propertyTypes.map(t => 
      t.charAt(0).toUpperCase() + t.slice(1).toLowerCase().replace(/_/g, " ")
    );
    parts.push(types.join(", "));
  }
  
  if (criteria.areas && criteria.areas.length > 0) {
    parts.push(`in ${criteria.areas.slice(0, 2).join(", ")}`);
  }
  
  if (criteria.priceMax) {
    parts.push(`under KES ${(criteria.priceMax / 1000).toFixed(0)}K`);
  }
  
  return parts.join(" ") || "All new listings";
}

export function SaveSearchButton({
  searchCriteria,
  isAuthenticated = false,
  userId,
  userEmail,
  userPhone,
  variant = "default",
  className,
  buttonText,
}: SaveSearchButtonProps) {
  const { success } = useToast();
  // Default button text based on variant
  const defaultText = variant === "compact" ? "Notify Me" : "Notify Me";
  const displayText = buttonText || defaultText;
  const savedText = "Notified!";
  const [modalOpen, setModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle successful alert creation (from modal or quick save)
  const handleSuccess = () => {
    // Mark as saved in localStorage
    const savedSearches = JSON.parse(localStorage.getItem("mitasafi_saved_searches") || "[]");
    savedSearches.push(JSON.stringify(searchCriteria));
    localStorage.setItem("mitasafi_saved_searches", JSON.stringify(savedSearches));
    
    setIsSaved(true);
    success("You'll be notified when new listings match");
  };

  // Check if user can do one-click save (needs email OR phone)
  const canQuickSave = isAuthenticated && (userEmail || userPhone);

  // Check if this search is already saved (for logged-in users)
  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    
    // Check localStorage for saved search hash
    const savedSearches = JSON.parse(localStorage.getItem("mitasafi_saved_searches") || "[]");
    const searchHash = JSON.stringify(searchCriteria);
    setIsSaved(savedSearches.includes(searchHash));
  }, [searchCriteria, isAuthenticated, userId]);

  // One-click save for logged-in users with contact info
  const handleQuickSave = async () => {
    // If user can't quick save, open modal
    if (!canQuickSave) {
      setModalOpen(true);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/search-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail || null,
          phone: userPhone || null,
          name: formatCriteriaLabel(searchCriteria),
          frequency: "instant",
          notify_email: !!userEmail,
          notify_sms: !!userPhone,
          areas: searchCriteria.areas,
          property_types: searchCriteria.propertyTypes,
          bedrooms_min: searchCriteria.bedroomsMin,
          bedrooms_max: searchCriteria.bedroomsMax,
          price_min: searchCriteria.priceMin,
          price_max: searchCriteria.priceMax,
          verified_only: searchCriteria.verifiedOnly,
          available_now: searchCriteria.availableNow,
          source: "manual",
          user_id: userId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save search");
      }

      handleSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      // Open modal as fallback
      setModalOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  // Render based on variant
  if (variant === "compact") {
    return (
      <>
        <button
          onClick={handleQuickSave}
          disabled={isSaving || isSaved}
          className={cn(
            "inline-flex items-center gap-1.5 text-sm font-medium transition-colors",
            isSaved
              ? "text-green-600"
              : "text-gray-600 hover:text-gray-900",
            className
          )}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isSaved ? (
            <Check className="w-4 h-4" />
          ) : (
            <Bell className="w-4 h-4" />
          )}
          {isSaved ? savedText : displayText}
        </button>
        <SearchAlertModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setError(null);
          }}
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

  if (variant === "banner") {
    return (
      <>
        <div className={cn(
          "flex items-center justify-between gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200",
          className
        )}>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Bell className="w-4 h-4 text-gray-400" />
            <span>Get notified when new properties match this search</span>
          </div>
          <button
            onClick={handleQuickSave}
            disabled={isSaving || isSaved}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
              isSaved
                ? "bg-green-100 text-green-700"
                : "bg-gray-900 text-white hover:bg-gray-800"
            )}
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isSaved ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Bell className="w-3.5 h-3.5" />
            )}
            {isSaved ? savedText : displayText}
          </button>
        </div>

        <SearchAlertModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setError(null);
          }}
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

  // Default variant - uses CTA orange color for prominence
  return (
    <>
      <button
        onClick={handleQuickSave}
        disabled={isSaving || isSaved}
        className={cn(
          "inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-all",
          isSaved
            ? "bg-green-100 text-green-700 border border-green-200"
            : "bg-cta-500 hover:bg-cta-600 text-white",
          className
        )}
      >
        {isSaving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isSaved ? (
          <Check className="w-4 h-4" />
        ) : (
          <Bell className="w-4 h-4" />
        )}
        {isSaved ? savedText : displayText}
      </button>

      <SearchAlertModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setError(null);
        }}
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

export default SaveSearchButton;
