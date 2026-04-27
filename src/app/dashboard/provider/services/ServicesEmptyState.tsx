/**
 * Services Empty State
 * 
 * Displayed when provider has no services yet.
 * Clear CTA to add first services.
 */

"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

export function ServicesEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* Simple illustration - just a styled box */}
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-6">
        <Plus className="w-8 h-8 text-gray-400" />
      </div>

      {/* Title */}
      <h2 className="text-xl font-semibold text-gray-900 mb-2 text-center">
        No services added yet
      </h2>

      {/* Description */}
      <p className="text-gray-500 text-center max-w-sm mb-8">
        Add what you do (plumbing, cleaning, moving, etc.) so people can request your service.
      </p>

      {/* CTA Button */}
      <Link
        href="/dashboard/provider/services/new"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add a Service
      </Link>

      {/* Help text */}
      <p className="text-xs text-gray-400 mt-6 text-center max-w-xs">
        Takes about 2–3 minutes.
      </p>
    </div>
  );
}
