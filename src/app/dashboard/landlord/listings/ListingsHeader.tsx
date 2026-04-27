/**
 * Listings Page Header
 * 
 * Shows title, listing count, and action buttons.
 * Purpose: Advertise vacancies and attract tenants.
 */

"use client";

import Link from "next/link";
import { Megaphone, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface ListingsHeaderProps {
  listingCount: number;
}

export function ListingsHeader({ listingCount }: ListingsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      {/* Title & Count */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Listings</h1>
        <p className="text-gray-500 mt-1">
          {listingCount === 0 
            ? "Advertise your vacancies and find quality tenants" 
            : `${listingCount} active ${listingCount === 1 ? 'listing' : 'listings'}`
          }
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Import Button - Secondary */}
        <button
          className={cn(
            "hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-lg",
            "text-gray-700 bg-white border border-gray-300",
            "hover:bg-gray-50 hover:border-gray-400 transition-colors",
            "text-sm font-medium",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          )}
        >
          <Upload className="w-4 h-4" />
          Import
        </button>

        {/* List Vacancy Button - Primary */}
        <Link
          href="/dashboard/landlord/listings/new"
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg",
            "text-white bg-cta-600",
            "hover:bg-cta-700 transition-colors",
            "text-sm font-semibold",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-cta-500 focus-visible:ring-offset-2",
            "shadow-sm"
          )}
        >
          <Megaphone className="w-4 h-4" strokeWidth={2.5} />
          List a Vacancy
        </Link>
      </div>
    </div>
  );
}
