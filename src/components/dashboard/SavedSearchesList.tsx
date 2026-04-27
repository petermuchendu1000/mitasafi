/**
 * Saved Searches List Component
 * 
 * Displays user's saved search alerts with:
 * - Search criteria summary
 * - Notification settings
 * - Edit/Delete actions
 * - Last triggered info
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellOff,
  Trash2,
  MapPin,
  Home,
  DollarSign,
  Mail,
  Smartphone,
  Clock,
  ExternalLink,
  MoreVertical,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface SearchAlert {
  id: string;
  name: string | null;
  areas: string[] | null;
  property_types: string[] | null;
  bedrooms_min: number | null;
  bedrooms_max: number | null;
  price_min: number | null;
  price_max: number | null;
  verified_only: boolean | null;
  frequency: string;
  notify_email: boolean;
  notify_sms: boolean;
  created_at: string;
  last_triggered_at: string | null;
  matches_count: number | null;
  source: string | null;
  source_listing_id: string | null;
}

interface SavedSearchesListProps {
  searches: SearchAlert[];
}

// Format price for display
function formatPrice(amount: number): string {
  if (amount >= 1000000) {
    return `KES ${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `KES ${(amount / 1000).toFixed(0)}K`;
  }
  return `KES ${amount.toLocaleString()}`;
}

// Format relative time
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

// Build search URL from criteria
function buildSearchUrl(search: SearchAlert): string {
  const params = new URLSearchParams();
  
  if (search.areas?.[0]) {
    params.set("area", search.areas[0]);
  }
  if (search.property_types?.[0]) {
    params.set("type", search.property_types[0]);
  }
  if (search.bedrooms_min) {
    params.set("beds", search.bedrooms_min.toString());
  }
  if (search.price_min) {
    params.set("minPrice", search.price_min.toString());
  }
  if (search.price_max) {
    params.set("maxPrice", search.price_max.toString());
  }
  
  const queryString = params.toString();
  return queryString ? `/properties?${queryString}` : "/properties";
}

export function SavedSearchesList({ searches }: SavedSearchesListProps) {
  return (
    <div className="space-y-4">
      {searches.map((search) => (
        <SearchCard key={search.id} search={search} />
      ))}
    </div>
  );
}

function SearchCard({ search }: { search: SearchAlert }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Generate display name
  const displayName = search.name || generateSearchName(search);
  const searchUrl = buildSearchUrl(search);

  // Handle delete
  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this saved search?")) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/search-alerts?id=${search.id}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        router.refresh();
      }
    } catch (error) {
      console.error("Failed to delete search:", error);
    } finally {
      setIsDeleting(false);
      setShowMenu(false);
    }
  };

  // Handle pause/resume
  const handleTogglePause = async () => {
    // TODO: Implement pause/resume API
    setShowMenu(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-4">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Name & Source Badge */}
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-gray-900 truncate">{displayName}</h3>
            {search.source && search.source !== "manual" && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full capitalize">
                {search.source.replace("_", " ")}
              </span>
            )}
          </div>

          {/* Criteria Tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            {search.areas && search.areas.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded-md">
                <MapPin className="w-3.5 h-3.5" />
                {search.areas.slice(0, 2).join(", ")}
                {search.areas.length > 2 && ` +${search.areas.length - 2}`}
              </span>
            )}
            {search.property_types && search.property_types.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded-md">
                <Home className="w-3.5 h-3.5" />
                {search.property_types.join(", ")}
              </span>
            )}
            {search.bedrooms_min && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded-md">
                {search.bedrooms_min}+ BR
              </span>
            )}
            {(search.price_min || search.price_max) && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded-md">
                <DollarSign className="w-3.5 h-3.5" />
                {search.price_min && search.price_max
                  ? `${formatPrice(search.price_min)} - ${formatPrice(search.price_max)}`
                  : search.price_min
                  ? `From ${formatPrice(search.price_min)}`
                  : `Up to ${formatPrice(search.price_max!)}`}
              </span>
            )}
          </div>

          {/* Meta Info */}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {/* Notification Channels */}
            <div className="flex items-center gap-2">
              {search.notify_email && (
                <span className="flex items-center gap-1" title="Email notifications">
                  <Mail className="w-3.5 h-3.5" />
                </span>
              )}
              {search.notify_sms && (
                <span className="flex items-center gap-1" title="SMS notifications">
                  <Smartphone className="w-3.5 h-3.5" />
                </span>
              )}
              <span className="capitalize">{search.frequency}</span>
            </div>

            {/* Last Triggered */}
            {search.last_triggered_at && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Last sent {formatRelativeTime(search.last_triggered_at)}
              </span>
            )}

            {/* Created Date */}
            <span className="hidden sm:inline">
              Created {formatRelativeTime(search.created_at)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* View Search Button */}
          <Link
            href={searchUrl}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden sm:inline">View</span>
          </Link>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </button>

            {showMenu && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                
                {/* Menu */}
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Delete Search
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Generate a search name from criteria
function generateSearchName(search: SearchAlert): string {
  const parts: string[] = [];
  
  if (search.bedrooms_min) {
    parts.push(`${search.bedrooms_min}+ BR`);
  }
  
  if (search.property_types && search.property_types.length > 0) {
    parts.push(search.property_types[0]);
  }
  
  if (search.areas && search.areas.length > 0) {
    parts.push(`in ${search.areas[0]}`);
  }
  
  if (search.price_max) {
    parts.push(`under ${formatPrice(search.price_max)}`);
  }
  
  return parts.join(" ") || "All Properties";
}

export default SavedSearchesList;
