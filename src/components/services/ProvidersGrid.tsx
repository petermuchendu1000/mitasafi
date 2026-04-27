/**
 * Providers Grid Component
 * 
 * Grid layout for displaying service providers with pagination.
 * Supports empty states and loading states.
 * 
 * Design: Responsive grid with teal/orange accents
 */

"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProviderCard, ProviderCardSkeleton } from "./ProviderCard";
import { cn } from "@/lib/utils";
import type { ServiceProviderCardData } from "@/types/service-providers";

interface ProvidersGridProps {
  providers: ServiceProviderCardData[];
  total: number;
  page: number;
  totalPages: number;
  isLoading?: boolean;
  className?: string;
}

export function ProvidersGrid({
  providers,
  total,
  page,
  totalPages,
  isLoading = false,
  className,
}: ProvidersGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Navigate to page
  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newPage === 1) {
      params.delete("page");
    } else {
      params.set("page", String(newPage));
    }
    router.push(`${pathname}?${params.toString()}`);
    // Scroll to top of results
    window.scrollTo({ top: 300, behavior: "smooth" });
  };
  
  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (page > 3) {
        pages.push("ellipsis");
      }
      
      // Show pages around current
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (page < totalPages - 2) {
        pages.push("ellipsis");
      }
      
      // Always show last page
      pages.push(totalPages);
    }
    
    return pages;
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <ProviderCardSkeleton key={i} />
        ))}
      </div>
    );
  }
  
  // Empty state
  if (providers.length === 0) {
    return (
      <div className="text-center py-16">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No providers found
        </h3>
        <p className="text-gray-600 max-w-md mx-auto mb-6">
          Try adjusting your filters or search terms to find more service providers.
        </p>
        <button
          onClick={() => router.push("/services/browse")}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          Browse All Providers
        </button>
      </div>
    );
  }
  
  return (
    <div className={className}>
      {/* Results Count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">
          Showing {(page - 1) * 12 + 1}-{Math.min(page * 12, total)} of {total} providers
        </p>
      </div>
      
      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {providers.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            showCompare={true}
          />
        ))}
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          {/* Previous Button */}
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page === 1}
            className={cn(
              "inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              page === 1
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-700 hover:bg-gray-100"
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          
          {/* Page Numbers */}
          <div className="hidden sm:flex items-center gap-1">
            {getPageNumbers().map((p, i) =>
              p === "ellipsis" ? (
                <span key={`ellipsis-${i}`} className="px-3 py-2 text-gray-400">
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  className={cn(
                    "w-10 h-10 rounded-lg text-sm font-medium transition-colors",
                    page === p
                      ? "bg-gray-900 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  {p}
                </button>
              )
            )}
          </div>
          
          {/* Mobile Page Indicator */}
          <span className="sm:hidden px-4 py-2 text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          
          {/* Next Button */}
          <button
            onClick={() => goToPage(page + 1)}
            disabled={page === totalPages}
            className={cn(
              "inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              page === totalPages
                ? "text-gray-300 cursor-not-allowed"
                : "text-gray-700 hover:bg-gray-100"
            )}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
