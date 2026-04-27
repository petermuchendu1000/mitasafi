/**
 * Listings Grid Component
 * 
 * Displays listings in a responsive grid with filtering options.
 * Client component for interactive features.
 * 
 * Features:
 * - Status filtering
 * - Pause/Resume listings
 * - Delete with confirmation
 * - Toast notifications
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ListingCard, type ListingCardData } from "./ListingCard";
import { useToast } from "@/components/ui";
import { 
  pauseListing, 
  resumeListing, 
  deleteListing,
  duplicateListing,
  markAsRented
} from "./actions";
import { Filter, AlertTriangle, X } from "lucide-react";

interface ListingsGridProps {
  listings: ListingCardData[];
}

type StatusFilter = "all" | "active" | "draft" | "paused" | "rented";

// =============================================================================
// DELETE CONFIRMATION MODAL
// =============================================================================

interface DeleteConfirmModalProps {
  isOpen: boolean;
  listingTitle: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmModal({ isOpen, listingTitle, isDeleting, onConfirm, onCancel }: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
          Delete Listing?
        </h3>
        <p className="text-sm text-gray-600 text-center mb-6">
          Are you sure you want to delete <span className="font-medium">"{listingTitle}"</span>? 
          This action cannot be undone and all associated photos will be removed.
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className={cn(
              "flex-1 px-4 py-2.5 rounded-lg text-sm font-medium",
              "bg-gray-100 text-gray-700 hover:bg-gray-200",
              "transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className={cn(
              "flex-1 px-4 py-2.5 rounded-lg text-sm font-medium",
              "bg-red-600 text-white hover:bg-red-700",
              "transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "flex items-center justify-center gap-2"
            )}
          >
            {isDeleting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Listing"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ListingsGrid({ listings: initialListings }: ListingsGridProps) {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [isPending, startTransition] = useTransition();
  
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  
  // Local state for optimistic updates
  const [listings, setListings] = useState(initialListings);
  
  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    listingId: string;
    listingTitle: string;
  }>({ isOpen: false, listingId: "", listingTitle: "" });
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync with server data when it changes
  if (initialListings !== listings && !isPending) {
    setListings(initialListings);
  }

  // Filter listings
  const filteredListings = listings.filter((listing) => {
    if (statusFilter === "all") return true;
    return listing.status === statusFilter;
  });

  // Count by status
  const counts = {
    all: listings.length,
    active: listings.filter((l) => l.status === "active").length,
    draft: listings.filter((l) => l.status === "draft").length,
    paused: listings.filter((l) => l.status === "paused").length,
    rented: listings.filter((l) => l.status === "rented").length,
  };

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handlePause = async (id: string) => {
    const listing = listings.find(l => l.id === id);
    if (!listing) return;

    // Optimistic update
    setListings(prev => 
      prev.map(l => l.id === id ? { ...l, status: "paused" as const } : l)
    );

    startTransition(async () => {
      const result = await pauseListing(id);
      
      if (result.success) {
        success("Listing paused");
      } else {
        // Revert on error
        setListings(prev => 
          prev.map(l => l.id === id ? { ...l, status: "active" as const } : l)
        );
        showError(result.error || "Failed to pause");
      }
    });
  };

  const handleResume = async (id: string) => {
    const listing = listings.find(l => l.id === id);
    if (!listing) return;

    // Optimistic update
    setListings(prev => 
      prev.map(l => l.id === id ? { ...l, status: "active" as const } : l)
    );

    startTransition(async () => {
      const result = await resumeListing(id);
      
      if (result.success) {
        success("Listing active");
      } else {
        // Revert on error
        setListings(prev => 
          prev.map(l => l.id === id ? { ...l, status: "paused" as const } : l)
        );
        showError(result.error || "Failed to resume");
      }
    });
  };

  const handleDeleteClick = (id: string) => {
    const listing = listings.find(l => l.id === id);
    if (!listing) return;

    setDeleteModal({
      isOpen: true,
      listingId: id,
      listingTitle: listing.title,
    });
  };

  const handleDeleteConfirm = async () => {
    const { listingId, listingTitle } = deleteModal;
    setIsDeleting(true);

    const result = await deleteListing(listingId);
    
    setIsDeleting(false);
    setDeleteModal({ isOpen: false, listingId: "", listingTitle: "" });

    if (result.success) {
      // Remove from local state
      setListings(prev => prev.filter(l => l.id !== listingId));
      success("Listing deleted");
    } else {
      showError(result.error || "Failed to delete");
    }
  };

  const handleDeleteCancel = () => {
    if (!isDeleting) {
      setDeleteModal({ isOpen: false, listingId: "", listingTitle: "" });
    }
  };

  const handleDuplicate = async (id: string) => {
    const listing = listings.find(l => l.id === id);
    if (!listing) return;

    startTransition(async () => {
      const result = await duplicateListing(id);
      
      if (result.success && result.newListingId) {
        success("Draft copy created");
        // Navigate to edit the new listing
        router.push(`/dashboard/landlord/listings/${result.newListingId}/edit`);
      } else {
        showError(result.error || "Failed to duplicate");
      }
    });
  };

  const handleCopyLink = (id: string) => {
    const url = `${window.location.origin}/properties/${id}`;
    navigator.clipboard.writeText(url);
    success("Link copied");
  };

  const handleMarkAsRented = async (id: string) => {
    const listing = listings.find(l => l.id === id);
    if (!listing) return;

    // Optimistic update
    setListings(prev => 
      prev.map(l => l.id === id ? { ...l, status: "rented" as const } : l)
    );

    startTransition(async () => {
      const result = await markAsRented(id);
      
      if (result.success) {
        success("Marked as rented");
      } else {
        // Revert on error
        setListings(prev => 
          prev.map(l => l.id === id ? { ...l, status: listing.status } : l)
        );
        showError(result.error || "Failed to update");
      }
    });
  };

  return (
    <>
      <div className="space-y-4">
        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {(["all", "active", "draft", "paused", "rented"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                  statusFilter === status
                    ? "bg-teal-100 text-teal-700"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                <span className={cn(
                  "ml-1.5 text-xs",
                  statusFilter === status ? "text-teal-600" : "text-gray-400"
                )}>
                  {counts[status]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Results Count */}
        {filteredListings.length !== listings.length && (
          <p className="text-sm text-gray-500">
            Showing {filteredListings.length} of {listings.length} listings
          </p>
        )}

        {/* Grid */}
        {filteredListings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onPause={handlePause}
                onResume={handleResume}
                onDelete={handleDeleteClick}
                onDuplicate={handleDuplicate}
                onCopyLink={handleCopyLink}
                onMarkAsRented={handleMarkAsRented}
                isUpdating={isPending}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Filter className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No listings match this filter</p>
            <button
              onClick={() => setStatusFilter("all")}
              className="mt-2 text-sm text-teal-600 hover:text-teal-700 font-medium"
            >
              Show all listings
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        listingTitle={deleteModal.listingTitle}
        isDeleting={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </>
  );
}
