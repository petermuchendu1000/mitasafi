/**
 * Listing Actions Component
 * 
 * Client-side actions for managing a listing from the detail page.
 * Handles pause/resume, copy link, mark as rented, delete.
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Pause,
  Play,
  Copy,
  Home,
  Trash2,
  AlertTriangle,
  X,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui";
import {
  pauseListing,
  resumeListing,
  deleteListing,
  duplicateListing,
  markAsRented,
} from "../actions";

interface ListingActionsProps {
  listing: {
    id: string;
    title: string;
    status: "draft" | "active" | "paused" | "rented" | "expired" | "archived";
  };
}

export function ListingActions({ listing }: ListingActionsProps) {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handlePause = () => {
    startTransition(async () => {
      const result = await pauseListing(listing.id);
      if (result.success) {
        success("Listing paused");
        router.refresh();
      } else {
        showError(result.error || "Failed to pause");
      }
    });
  };

  const handleResume = () => {
    startTransition(async () => {
      const result = await resumeListing(listing.id);
      if (result.success) {
        success("Listing active");
        router.refresh();
      } else {
        showError(result.error || "Failed to resume");
      }
    });
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/properties/${listing.id}`;
    navigator.clipboard.writeText(url);
    success("Link copied");
  };

  const handleMarkAsRented = () => {
    startTransition(async () => {
      const result = await markAsRented(listing.id);
      if (result.success) {
        success("Marked as rented");
        router.refresh();
      } else {
        showError(result.error || "Failed to update");
      }
    });
  };

  const handleDuplicate = () => {
    startTransition(async () => {
      const result = await duplicateListing(listing.id);
      if (result.success && result.newListingId) {
        success("Draft copy created");
        router.push(`/dashboard/landlord/listings/${result.newListingId}/edit`);
      } else {
        showError(result.error || "Failed to duplicate");
      }
    });
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteListing(listing.id);
    setIsDeleting(false);
    setShowDeleteModal(false);
    
    if (result.success) {
      success("Listing deleted");
      router.push("/dashboard/landlord/listings");
    } else {
      showError(result.error || "Failed to delete");
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">Quick Actions</h3>
        
        <div className="space-y-1">
          {/* Pause / Resume */}
          {listing.status === "active" && (
            <ActionButton
              icon={<Pause className="w-4 h-4" />}
              label="Pause Listing"
              description="Temporarily hide from tenants"
              onClick={handlePause}
              disabled={isPending}
            />
          )}
          
          {listing.status === "paused" && (
            <ActionButton
              icon={<Play className="w-4 h-4" />}
              label="Resume Listing"
              description="Make visible to tenants again"
              onClick={handleResume}
              disabled={isPending}
            />
          )}
          
          {/* Mark as Rented */}
          {(listing.status === "active" || listing.status === "paused") && (
            <ActionButton
              icon={<Home className="w-4 h-4" />}
              label="Mark as Rented"
              description="Found a tenant? Mark it here"
              onClick={handleMarkAsRented}
              disabled={isPending}
            />
          )}
          
          {/* Copy Link */}
          <ActionButton
            icon={<Copy className="w-4 h-4" />}
            label="Copy Link"
            description="Share listing link"
            onClick={handleCopyLink}
            disabled={isPending}
          />
          
          {/* Duplicate */}
          <ActionButton
            icon={<Share2 className="w-4 h-4" />}
            label="Duplicate"
            description="Create a copy as draft"
            onClick={handleDuplicate}
            disabled={isPending}
          />
          
          {/* Delete */}
          <ActionButton
            icon={<Trash2 className="w-4 h-4" />}
            label="Delete Listing"
            description="Permanently remove"
            onClick={() => setShowDeleteModal(true)}
            disabled={isPending}
            variant="danger"
          />
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isDeleting && setShowDeleteModal(false)}
          />
          
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => !isDeleting && setShowDeleteModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>

            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
              Delete Listing?
            </h3>
            <p className="text-sm text-gray-600 text-center mb-6">
              Are you sure you want to delete <span className="font-semibold">"{listing.title}"</span>? 
              This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
      )}
    </>
  );
}

// =============================================================================
// ACTION BUTTON
// =============================================================================

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "danger";
}

function ActionButton({ 
  icon, 
  label, 
  description, 
  onClick, 
  disabled,
  variant = "default",
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-left",
        "hover:bg-gray-50",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className="flex-shrink-0 text-gray-500">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className={cn("font-medium text-sm", variant === "danger" ? "text-red-600" : "text-gray-900")}>{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </button>
  );
}
