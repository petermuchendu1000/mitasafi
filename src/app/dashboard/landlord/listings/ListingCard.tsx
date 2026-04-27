/**
 * Landlord Listing Card Component
 * 
 * Wrapper around shared ListingCard with landlord-specific actions menu.
 * Used in the My Listings page in the landlord dashboard.
 */

"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { 
  MoreVertical,
  Pencil,
  Pause,
  Play,
  Trash2,
  Share2,
  ExternalLink,
  Copy,
  Home,
} from "lucide-react";
import { 
  ListingCard as SharedListingCard, 
  type ListingCardData 
} from "@/components/shared";

// Re-export types for backward compatibility
export type { ListingCardData };
export type { ListingCategory, CommercialType, ListingStatus } from "@/components/shared";

// =============================================================================
// TYPES
// =============================================================================

interface LandlordListingCardProps {
  listing: ListingCardData;
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onCopyLink?: (id: string) => void;
  onMarkAsRented?: (id: string) => void;
  isUpdating?: boolean;
}

// =============================================================================
// ACTIONS MENU COMPONENT
// =============================================================================

interface ActionsMenuProps {
  listing: ListingCardData;
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onCopyLink?: (id: string) => void;
  onMarkAsRented?: (id: string) => void;
}

function ActionsMenu({ 
  listing, 
  onPause, 
  onResume, 
  onDelete, 
  onDuplicate, 
  onCopyLink, 
  onMarkAsRented 
}: ActionsMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="absolute top-2 right-2 z-20" ref={menuRef}>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsMenuOpen(!isMenuOpen);
        }}
        className={cn(
          "p-1.5 rounded-full bg-white/90 text-gray-600 shadow-sm border border-gray-200",
          "hover:bg-white hover:text-gray-900 transition-colors"
        )}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {/* Dropdown Menu */}
      {isMenuOpen && (
        <div 
          className="absolute top-full right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Edit */}
          <Link
            href={`/dashboard/landlord/listings/${listing.id}/edit`}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => setIsMenuOpen(false)}
          >
            <Pencil className="w-4 h-4" />
            Edit
          </Link>
          
          {/* View Public - only if not draft */}
          {listing.status !== "draft" && (
            <Link
              href={`/properties/${listing.id}`}
              target="_blank"
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={() => setIsMenuOpen(false)}
            >
              <ExternalLink className="w-4 h-4" />
              View Public
            </Link>
          )}
          
          {/* Copy Link */}
          <button
            onClick={() => {
              if (onCopyLink) {
                onCopyLink(listing.id);
              } else {
                navigator.clipboard.writeText(`${window.location.origin}/properties/${listing.id}`);
              }
              setIsMenuOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Copy className="w-4 h-4" />
            Copy Link
          </button>
          
          {/* Duplicate */}
          {onDuplicate && (
            <button
              onClick={() => {
                onDuplicate(listing.id);
                setIsMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Share2 className="w-4 h-4" />
              Duplicate
            </button>
          )}
          
          <hr className="my-1 border-gray-100" />
          
          {/* Pause - only for active listings */}
          {listing.status === "active" && onPause && (
            <button
              onClick={() => {
                onPause(listing.id);
                setIsMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Pause className="w-4 h-4" />
              Pause Listing
            </button>
          )}
          
          {/* Resume - only for paused listings */}
          {listing.status === "paused" && onResume && (
            <button
              onClick={() => {
                onResume(listing.id);
                setIsMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Play className="w-4 h-4" />
              Resume Listing
            </button>
          )}
          
          {/* Mark as Rented - for active or paused */}
          {(listing.status === "active" || listing.status === "paused") && onMarkAsRented && (
            <button
              onClick={() => {
                onMarkAsRented(listing.id);
                setIsMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Home className="w-4 h-4" />
              Mark as Rented
            </button>
          )}
          
          {/* Delete */}
          {onDelete && (
            <button
              onClick={() => {
                onDelete(listing.id);
                setIsMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-gray-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ListingCard({ 
  listing, 
  onPause, 
  onResume, 
  onDelete, 
  onDuplicate,
  onCopyLink,
  onMarkAsRented,
  isUpdating 
}: LandlordListingCardProps) {
  return (
    <SharedListingCard
      listing={listing}
      variant="landlord"
      isUpdating={isUpdating}
      actions={
        <ActionsMenu
          listing={listing}
          onPause={onPause}
          onResume={onResume}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onCopyLink={onCopyLink}
          onMarkAsRented={onMarkAsRented}
        />
      }
    />
  );
}
