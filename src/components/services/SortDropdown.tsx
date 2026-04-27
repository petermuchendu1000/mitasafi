/**
 * Sort Dropdown Component
 * 
 * Dropdown for sorting service provider results.
 * URL-synced for shareable sort state.
 */

"use client";

import { useState, useRef, useEffect, memo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROVIDER_SORT_OPTIONS } from "@/lib/constants";

interface SortDropdownProps {
  className?: string;
}

export const SortDropdown = memo(function SortDropdown({ className }: SortDropdownProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentSort = searchParams.get("sort") || "recommended";
  const currentOption = PROVIDER_SORT_OPTIONS.find((opt) => opt.value === currentSort);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value === "recommended") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }
    
    // Don't reset page when sorting
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-brand-300 hover:bg-brand-50/50 transition-colors"
      >
        <span className="hidden sm:inline">Sort:</span>
        <span className="text-gray-900">{currentOption?.label || "Recommended"}</span>
        <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
          {PROVIDER_SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSortChange(option.value)}
              className={cn(
                "w-full px-4 py-2.5 text-left text-sm flex items-center justify-between transition-colors",
                currentSort === option.value
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-700 hover:bg-gray-50"
              )}
            >
              {option.label}
              {currentSort === option.value && (
                <Check className="w-4 h-4 text-brand-600" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
