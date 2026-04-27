/**
 * Provider Detail Page — Not Found
 *
 * Rendered when getProviderById returns null (provider doesn't exist
 * or has been deactivated).
 */

import Link from "next/link";
import { Search, ArrowLeft } from "lucide-react";

export default function ProviderNotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
          <Search className="w-8 h-8 text-gray-400" />
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Provider not found
        </h2>
        <p className="text-gray-600 mb-8">
          This provider may have been removed or is no longer available. Try browsing our other trusted professionals.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/services/browse"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition-colors shadow-sm"
          >
            <Search className="w-4 h-4" />
            Browse Providers
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
