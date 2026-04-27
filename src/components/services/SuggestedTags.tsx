// =============================================================================
// MITASAFI: SUGGESTED TAGS
// =============================================================================
// Displays related search suggestions like Fiverr's blue tag chips.
// Shows context-aware suggestions based on current search/category.
// =============================================================================

"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// =============================================================================
// SUGGESTED TAGS DATA
// =============================================================================
// Related searches organized by category

const SUGGESTIONS_BY_CATEGORY: Record<string, string[]> = {
  "home-services": [
    "house cleaning",
    "deep cleaning",
    "carpet cleaning",
    "window cleaning",
    "move-out cleaning",
    "office cleaning",
    "laundry services",
    "fumigation",
  ],
  plumbing: [
    "pipe repair",
    "drain cleaning",
    "water heater",
    "toilet repair",
    "leak detection",
    "bathroom fitting",
    "water tank",
    "pump installation",
  ],
  electrical: [
    "wiring installation",
    "socket repair",
    "lighting installation",
    "electrical inspection",
    "generator installation",
    "solar installation",
    "circuit breaker",
    "CCTV installation",
  ],
  security: [
    "security guards",
    "CCTV installation",
    "access control",
    "alarm systems",
    "event security",
    "residential security",
    "commercial security",
    "mobile patrol",
  ],
  moving: [
    "house moving",
    "office relocation",
    "furniture transport",
    "packing services",
    "storage solutions",
    "international moving",
    "same-day delivery",
    "cargo transport",
  ],
  "professional-services": [
    "legal services",
    "accounting",
    "property management",
    "interior design",
    "architecture",
    "surveying",
    "valuation",
    "consulting",
  ],
  construction: [
    "building contractors",
    "renovation",
    "painting services",
    "roofing",
    "tiling",
    "masonry",
    "carpentry",
    "welding",
  ],
  landscaping: [
    "garden design",
    "lawn care",
    "tree trimming",
    "irrigation",
    "outdoor lighting",
    "fencing",
    "paving",
    "swimming pool",
  ],
};

// Generic popular searches when no category selected
const POPULAR_SUGGESTIONS = [
  "house cleaning",
  "plumber",
  "electrician",
  "moving services",
  "security guards",
  "interior design",
  "painting",
  "lawn care",
  "pest control",
  "handyman",
];

// =============================================================================
// COMPONENT
// =============================================================================

interface SuggestedTagsProps {
  className?: string;
  maxTags?: number;
}

export function SuggestedTags({ className, maxTags = 10 }: SuggestedTagsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const currentCategory = searchParams.get("category");
  const currentQuery = searchParams.get("q");

  // Get suggestions based on current category
  const suggestions = currentCategory
    ? SUGGESTIONS_BY_CATEGORY[currentCategory] || POPULAR_SUGGESTIONS
    : POPULAR_SUGGESTIONS;

  // Filter out current search query from suggestions
  const filteredSuggestions = suggestions
    .filter((s) => s.toLowerCase() !== currentQuery?.toLowerCase())
    .slice(0, maxTags);

  // Handle tag click - set as search query
  const handleTagClick = (tag: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("q", tag);
    params.delete("page"); // Reset to page 1
    router.push(`${pathname}?${params.toString()}`);
  };

  if (filteredSuggestions.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <span className="text-sm text-gray-500 font-medium mr-1">Suggested</span>
      {filteredSuggestions.map((tag) => (
        <button
          key={tag}
          onClick={() => handleTagClick(tag)}
          className={cn(
            "px-3 py-1.5 text-sm rounded-full transition-all duration-200",
            "bg-brand-50 text-brand-700 hover:bg-brand-100 hover:text-brand-800",
            "border border-brand-200 hover:border-brand-300",
            "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1"
          )}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// COMPACT VARIANT
// =============================================================================
// Inline tags without "Suggested" label

export function SuggestedTagsCompact({ 
  className, 
  maxTags = 6 
}: SuggestedTagsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const currentCategory = searchParams.get("category");
  const currentQuery = searchParams.get("q");

  const suggestions = currentCategory
    ? SUGGESTIONS_BY_CATEGORY[currentCategory] || POPULAR_SUGGESTIONS
    : POPULAR_SUGGESTIONS;

  const filteredSuggestions = suggestions
    .filter((s) => s.toLowerCase() !== currentQuery?.toLowerCase())
    .slice(0, maxTags);

  const handleTagClick = (tag: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("q", tag);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  if (filteredSuggestions.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {filteredSuggestions.map((tag) => (
        <button
          key={tag}
          onClick={() => handleTagClick(tag)}
          className={cn(
            "px-2.5 py-1 text-xs rounded-full transition-colors",
            "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800",
            "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1"
          )}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
