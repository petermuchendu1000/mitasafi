/**
 * SavedProvidersList
 *
 * Client component that renders the grid of saved providers with
 * optimistic remove, view-profile CTA, and empty state.
 */

"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart,
  Star,
  BadgeCheck,
  ExternalLink,
  CalendarPlus,
  Loader2,
  Search,
} from "lucide-react";
import { useToast } from "@/components/ui";
import { removeSavedProvider } from "./actions";
import type { SavedProviderItem } from "@/lib/services/dashboard";

// =============================================================================
// TYPES
// =============================================================================

interface SavedProvidersListProps {
  providers: SavedProviderItem[];
}

// =============================================================================
// COMPONENT
// =============================================================================

export function SavedProvidersList({ providers: initial }: SavedProvidersListProps) {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  const [providers, setProviders] = useState(initial);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleRemove = useCallback(
    (providerId: string, providerName: string) => {
      setRemovingId(providerId);

      // Optimistic removal
      const previous = providers;
      setProviders((prev) => prev.filter((p) => p.provider_id !== providerId));

      startTransition(async () => {
        const result = await removeSavedProvider(providerId);

        if (!result.success) {
          // Rollback
          setProviders(previous);
          showError("Remove failed", result.error || "Please try again");
        } else {
          showSuccess("Removed", `${providerName} removed from your saved list`);
          router.refresh();
        }
        setRemovingId(null);
      });
    },
    [providers, router, showSuccess, showError]
  );

  // ── Empty State ─────────────────────────────────────────────────────────

  if (providers.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-50 flex items-center justify-center">
          <Heart className="w-8 h-8 text-brand-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          No saved providers yet
        </h2>
        <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
          When you find providers you like, tap the heart icon to save them
          here for quick access later.
        </p>
        <Link
          href="/services/browse"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
        >
          <Search className="w-4 h-4" />
          Browse Services
        </Link>
      </div>
    );
  }

  // ── Provider Grid ───────────────────────────────────────────────────────

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {providers.map((item) => {
        const isRemoving = removingId === item.provider_id;

        return (
          <div
            key={item.id}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition-all"
          >
            {/* Header: avatar + name + verified badge */}
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {item.provider_photo_url ? (
                  <img
                    src={item.provider_photo_url}
                    alt={item.provider_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-brand-700 font-bold text-lg">
                    {item.provider_name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">
                    {item.provider_name}
                  </h3>
                  {item.provider_is_verified && (
                    <BadgeCheck className="w-4 h-4 text-brand-500 flex-shrink-0" />
                  )}
                </div>
                {item.provider_tagline && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                    {item.provider_tagline}
                  </p>
                )}
              </div>
            </div>

            {/* Rating */}
            {item.provider_rating !== null && (
              <div className="flex items-center gap-1.5 mb-3">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-sm font-medium text-gray-900">
                  {item.provider_rating.toFixed(1)}
                </span>
                {item.provider_review_count !== null && (
                  <span className="text-xs text-gray-400">
                    ({item.provider_review_count}{" "}
                    {item.provider_review_count === 1 ? "review" : "reviews"})
                  </span>
                )}
              </div>
            )}

            {/* Saved date */}
            <p className="text-xs text-gray-400 mb-4">
              Saved{" "}
              {new Date(item.saved_at).toLocaleDateString("en-KE", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Link
                href={`/services/providers/${item.provider_id}`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-brand-700 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Profile
              </Link>
              <Link
                href={`/services/provider/${item.provider_id}/request`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-cta-600 rounded-lg hover:bg-cta-700 transition-colors"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                Book Again
              </Link>
              <button
                type="button"
                onClick={() =>
                  handleRemove(item.provider_id, item.provider_name)
                }
                disabled={isPending || isRemoving}
                className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                aria-label={`Remove ${item.provider_name}`}
              >
                {isRemoving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Heart className="w-4 h-4 fill-current" />
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
