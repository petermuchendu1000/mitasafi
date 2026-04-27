/**
 * Step 1: Category Selection
 * 
 * PERFORMANCE OPTIMIZED:
 * - Direct category/subcategory queries (no joins needed)
 * - Client-side filtering for instant search
 * - Reduced database round-trips
 * 
 * Provider selects a category and subcategory.
 * Categories load from database, subcategories filter based on selection.
 * Optimized for 700+ services by filtering at category level first.
 */

"use client";

import { useEffect, useState, useMemo } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWizard } from "../context";
import { getAllCategories } from "@/lib/data/services";
import type { ServiceCategory } from "@/lib/data/services";

export function Step1Category() {
  const { state, updateFormData } = useWizard();
  const { formData, errors } = state;

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Tier-based filtering: Main (12) vs More Services (8)
  const { mainCategories, moreCategories } = useMemo(() => {
    const main = categories.filter(c => c.is_primary && c.is_active);
    const more = categories.filter(c => !c.is_primary && c.is_active);
    
    return { mainCategories: main, moreCategories: more };
  }, [categories]);

  // Apply search filter across all categories
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return { main: mainCategories, more: moreCategories };
    }

    const query = searchQuery.toLowerCase();
    const filterFn = (cat: ServiceCategory) =>
      cat.name.toLowerCase().includes(query) ||
      cat.description?.toLowerCase().includes(query) ||
      cat.slug.toLowerCase().includes(query);

    return {
      main: mainCategories.filter(filterFn),
      more: moreCategories.filter(filterFn),
    };
  }, [mainCategories, moreCategories, searchQuery]);

  // All main categories are always visible (no slicing)
  // Display: 12 categories total, tier-ordered by urgency → frequency
  const visibleMainCategories = filteredCategories.main;

  // Load categories on mount
  useEffect(() => {
    async function loadCategories() {
      // OPTIMIZATION: Direct query, no joins needed
      const { data, error } = await getAllCategories();

      if (!error && data) {
        setCategories(data);
      }
      setIsLoadingCategories(false);
    }

    loadCategories();
  }, []);

  // Maximum categories a provider can select
  // Business rule: No legitimate provider offers 20+ different services
  // This prevents spam/fraud and ensures quality specialists
  const MAX_CATEGORIES = 5;

  const handleCategorySelect = (categoryId: string) => {
    const currentCategories = formData.categoryIds || [];
    const isSelected = currentCategories.includes(categoryId);
    
    // If already selected, allow deselection
    // If not selected, check limit before adding
    if (!isSelected && currentCategories.length >= MAX_CATEGORIES) {
      // Already at max - don't add more
      return;
    }
    
    // Toggle selection
    const newCategoryIds = isSelected
      ? currentCategories.filter(id => id !== categoryId)
      : [...currentCategories, categoryId];
    
    updateFormData({
      categoryIds: newCategoryIds,
    });
  };

  const isAtMaxCategories = (formData.categoryIds?.length || 0) >= MAX_CATEGORIES;

  if (isLoadingCategories) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading categories...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          What kind of work do you do?
        </h2>
        <p className="text-gray-500 text-sm">
          Select up to {MAX_CATEGORIES} categories that best describe your services.
        </p>
        {formData.categoryIds && formData.categoryIds.length > 0 && (
          <p className={`mt-2 text-sm font-medium ${isAtMaxCategories ? 'text-amber-600' : 'text-teal-600'}`}>
            {formData.categoryIds.length} of {MAX_CATEGORIES} {formData.categoryIds.length === 1 ? 'category' : 'categories'} selected
            {isAtMaxCategories && ' (maximum reached)'}
          </p>
        )}
      </div>

      {/* Search Box */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search for your work (e.g. plumber, cleaner, electrician)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Categories Grid */}
      <div className="mb-8">
        {filteredCategories.main.length === 0 && filteredCategories.more.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No categories found. Try a different search term.</p>
          </div>
        ) : (
          <>
            {/* Main Categories (12) - Always fully visible */}
            {filteredCategories.main.length > 0 && (
              <div className="mb-8">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {visibleMainCategories.map((category) => {
                    const isSelected = formData.categoryIds?.includes(category.id) || false;
                    const isDisabled = !isSelected && isAtMaxCategories;
                    return (
                      <button
                        key={category.id}
                        onClick={() => handleCategorySelect(category.id)}
                        disabled={isDisabled}
                        className={cn(
                          "relative p-4 rounded-xl border-2 text-left transition-all",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2",
                          isDisabled
                            ? "opacity-50 cursor-not-allowed border-gray-200 bg-gray-50"
                            : "hover:shadow-md",
                          isSelected
                            ? "border-teal-600 bg-teal-50 shadow-sm"
                            : !isDisabled && "border-gray-200 hover:border-gray-300 bg-white"
                        )}
                      >
                        {/* Checkbox indicator */}
                        <div className="absolute top-3 right-3">
                          <div className={cn(
                            "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                            isSelected
                              ? "bg-teal-600 border-teal-600"
                              : "bg-white border-gray-300"
                          )}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                        
                        <span
                          className={cn(
                            "block font-semibold text-sm pr-8",
                            isSelected ? "text-teal-700" : isDisabled ? "text-gray-400" : "text-gray-900"
                          )}
                        >
                          {category.name}
                        </span>
                      </button>
                    );
                  })}
                </div>

              </div>
            )}

            {/* More Services (8) - collapsed by default */}
            {!searchQuery && filteredCategories.more.length > 0 && (
              <div className="mb-6">
                <button
                  onClick={() => setShowAllCategories(!showAllCategories)}
                  className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium text-sm mb-3"
                >
                  <span>+ More Services ({filteredCategories.more.length})</span>
                  <svg
                    className={cn(
                      "w-4 h-4 transition-transform",
                      showAllCategories ? "rotate-180" : ""
                    )}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showAllCategories && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {filteredCategories.more.map((category) => {
                      const isSelected = formData.categoryIds?.includes(category.id) || false;
                      const isDisabled = !isSelected && isAtMaxCategories;
                      return (
                        <button
                          key={category.id}
                          onClick={() => handleCategorySelect(category.id)}
                          disabled={isDisabled}
                          className={cn(
                            "relative p-4 rounded-xl border-2 text-left transition-all",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2",
                            isDisabled
                              ? "opacity-50 cursor-not-allowed border-gray-200 bg-gray-50"
                              : "hover:shadow-md",
                            isSelected
                              ? "border-teal-600 bg-teal-50 shadow-sm"
                              : !isDisabled && "border-gray-200 hover:border-gray-300 bg-white"
                          )}
                        >
                          {/* Checkbox indicator */}
                          <div className="absolute top-3 right-3">
                            <div className={cn(
                              "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                              isSelected
                                ? "bg-teal-600 border-teal-600"
                                : "bg-white border-gray-300"
                            )}>
                              {isSelected && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </div>
                          
                          <span
                            className={cn(
                              "block font-semibold text-sm pr-8",
                              isSelected ? "text-teal-700" : isDisabled ? "text-gray-400" : "text-gray-900"
                            )}
                          >
                            {category.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Search results for More Services */}
            {searchQuery && filteredCategories.more.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">More Services</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredCategories.more.map((category) => {
                    const isSelected = formData.categoryIds?.includes(category.id) || false;
                    const isDisabled = !isSelected && isAtMaxCategories;
                    return (
                      <button
                        key={category.id}
                        onClick={() => handleCategorySelect(category.id)}
                        disabled={isDisabled}
                        className={cn(
                          "relative p-4 rounded-xl border-2 text-left transition-all",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2",
                          isDisabled
                            ? "opacity-50 cursor-not-allowed border-gray-200 bg-gray-50"
                            : "hover:shadow-md",
                          isSelected
                            ? "border-teal-600 bg-teal-50 shadow-sm"
                            : !isDisabled && "border-gray-200 hover:border-gray-300 bg-white"
                        )}
                      >
                        {/* Checkbox indicator */}
                        <div className="absolute top-3 right-3">
                          <div className={cn(
                            "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                            isSelected
                              ? "bg-teal-600 border-teal-600"
                              : "bg-white border-gray-300"
                          )}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                        
                        <span
                          className={cn(
                            "block font-semibold text-sm pr-8",
                            isSelected ? "text-teal-700" : isDisabled ? "text-gray-400" : "text-gray-900"
                          )}
                        >
                          {category.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Can't find message */}
            {!searchQuery && (
              <p className="mt-4 text-center text-sm text-gray-500">
                Can't see your service? Use the search box above.
              </p>
            )}
          </>
        )}
        {errors.categoryId && (
          <p className="mt-2 text-sm text-red-600">{errors.categoryId}</p>
        )}
      </div>
    </div>
  );
}
