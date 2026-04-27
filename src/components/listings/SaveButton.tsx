/**
 * Save Button Component
 * 
 * Heart button to save/favorite listings.
 * Works immediately for everyone (local storage).
 * Shows optional toast for account creation value prop.
 * 
 * Design: Heart icon, fills when saved, subtle animation
 */

"use client";

import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSavedListings } from "@/hooks/useSavedListings";
import { useToast } from "@/components/ui/Toast";

interface SaveButtonProps {
  listingId: string;
  listingTitle?: string;
  variant?: "icon" | "button" | "card";
  size?: "sm" | "md" | "lg";
  className?: string;
  showToast?: boolean;
}

export function SaveButton({
  listingId,
  listingTitle,
  variant = "icon",
  size = "md",
  className,
  showToast = true,
}: SaveButtonProps) {
  const { isSaved, toggleSave, isSynced } = useSavedListings();
  const toast = useToast();
  const [isAnimating, setIsAnimating] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const saved = mounted ? isSaved(listingId) : false;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Trigger animation
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);

    const wasSaved = isSaved(listingId);
    toggleSave(listingId);

    // Show toast with value prop
    if (showToast && !wasSaved) {
      if (!isSynced) {
        toast.success(
          "Saved!",
          "Create a free account to sync across devices"
        );
      } else {
        toast.success("Saved!", listingTitle ? `"${listingTitle}" added to your saves` : "Added to your saves");
      }
    } else if (showToast && wasSaved) {
      toast.info("Removed", "Listing removed from saves");
    }
  };

  const sizeClasses = {
    sm: {
      icon: "w-8 h-8",
      iconSize: "w-4 h-4",
    },
    md: {
      icon: "w-10 h-10",
      iconSize: "w-5 h-5",
    },
    lg: {
      icon: "w-12 h-12",
      iconSize: "w-6 h-6",
    },
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleClick}
        className={cn(
          "flex items-center justify-center rounded-full transition-all",
          "bg-white/90 backdrop-blur-sm hover:bg-white shadow-md hover:shadow-lg",
          "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2",
          sizeClasses[size].icon,
          isAnimating && "scale-110",
          className
        )}
        aria-label={saved ? "Remove from saved" : "Save listing"}
      >
        <Heart
          className={cn(
            sizeClasses[size].iconSize,
            "transition-all",
            saved 
              ? "fill-error-500 text-error-500" 
              : "text-gray-600 hover:text-error-500",
            isAnimating && "scale-125"
          )}
        />
      </button>
    );
  }

  if (variant === "button") {
    return (
      <button
        onClick={handleClick}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-xl transition-all",
          "border font-medium",
          saved
            ? "bg-error-50 border-error-200 text-error-700 hover:bg-error-100"
            : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300",
          "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2",
          className
        )}
        aria-label={saved ? "Remove from saved" : "Save listing"}
      >
        <Heart
          className={cn(
            "w-5 h-5 transition-all",
            saved && "fill-error-500 text-error-500",
            isAnimating && "scale-125"
          )}
        />
        <span>{saved ? "Saved" : "Save"}</span>
      </button>
    );
  }

  // Card variant - smaller, for use on property cards
  return (
    <button
      onClick={handleClick}
      className={cn(
        "absolute top-3 right-3 flex items-center justify-center",
        "w-9 h-9 rounded-full transition-all",
        "bg-white/90 backdrop-blur-sm hover:bg-white shadow-sm hover:shadow-md",
        "focus:outline-none focus:ring-2 focus:ring-brand-500",
        isAnimating && "scale-110",
        className
      )}
      aria-label={saved ? "Remove from saved" : "Save listing"}
    >
      <Heart
        className={cn(
          "w-5 h-5 transition-all",
          saved 
            ? "fill-error-500 text-error-500" 
            : "text-gray-600 hover:text-error-500",
          isAnimating && "scale-125"
        )}
      />
    </button>
  );
}

export default SaveButton;
