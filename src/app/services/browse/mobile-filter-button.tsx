/**
 * Mobile Filter Button Component
 * 
 * Client component to handle mobile filter sheet state.
 * Extracted to keep the main page as a server component.
 */

"use client";

import { useState } from "react";
import { Filter } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { ServiceFilterSidebar } from "@/components/services";
import type { ServiceCategoryWithSubs } from "@/types/service-providers";

interface MobileFilterButtonProps {
  categories: ServiceCategoryWithSubs[];
}

export function ServicesMobileFilterButton({ categories }: MobileFilterButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const searchParams = useSearchParams();

  // Count active filters
  let activeCount = 0;
  if (searchParams.get("category")) activeCount++;
  if (searchParams.get("subcategory")) activeCount += searchParams.get("subcategory")!.split(",").length;
  if (searchParams.get("area")) activeCount += searchParams.get("area")!.split(",").length;
  if (searchParams.get("price")) activeCount += searchParams.get("price")!.split(",").length;
  if (searchParams.get("rating")) activeCount++;
  if (searchParams.get("verified") === "true") activeCount++;
  if (searchParams.get("available") === "true") activeCount++;
  if (searchParams.get("instant") === "true") activeCount++;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="lg:hidden inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-brand-300 hover:bg-brand-50 transition-colors"
      >
        <Filter className="w-4 h-4" />
        <span>Filters</span>
        {activeCount > 0 && (
          <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium bg-brand-600 text-white rounded-full">
            {activeCount}
          </span>
        )}
      </button>

      {/* Mobile Filter Sheet */}
      <ServiceFilterSidebar
        categories={categories}
        isMobile={true}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
