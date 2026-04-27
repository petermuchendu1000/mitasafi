/**
 * Step 2: Services Selection
 * 
 * Shows services per category in sequence.
 * For each selected category, user picks specific services they offer.
 * Matches Kenyan mental model: "I'm a plumber, I do leaks and toilets"
 * 
 * Server-side filtered: only fetches services for selected categories.
 */

"use client";

import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { useWizard } from "../context";
import { getServicesByCategoryIds } from "@/lib/data/services";
import type { ServiceWithCategory } from "@/lib/data/services";
import type { SelectedService } from "../types";
import { CATEGORY_PRICE_DEFAULTS } from "../types";

export function Step2Services() {
  const { state, addService, removeService, isServiceSelected } = useWizard();
  const { formData, errors } = state;

  const [services, setServices] = useState<ServiceWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);

  // Load services for selected categories (server-side filtered)
  useEffect(() => {
    async function loadServices() {
      if (!formData.categoryIds || formData.categoryIds.length === 0) {
        setServices([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      const { data, error } = await getServicesByCategoryIds(formData.categoryIds);

      if (!error && data) {
        setServices(data);
      }

      setIsLoading(false);
    }

    loadServices();
  }, [formData.categoryIds]);

  // Get current category being shown
  const currentCategoryId = formData.categoryIds?.[currentCategoryIndex];
  
  // Filter services for current category + search
  const currentCategoryServices = useMemo(() => {
    const categoryServices = services.filter(s => s.category_id === currentCategoryId);
    
    if (!searchQuery.trim()) return categoryServices;
    
    const query = searchQuery.toLowerCase();
    return categoryServices.filter(
      (service) =>
        service.name.toLowerCase().includes(query) ||
        service.description?.toLowerCase().includes(query)
    );
  }, [services, currentCategoryId, searchQuery]);

  const currentCategoryName = currentCategoryServices[0]?.category_name || "";
  const totalCategories = formData.categoryIds?.length || 0;
  const selectedServicesCount = currentCategoryServices.filter(s => isServiceSelected(s.id)).length;

  const handleToggleService = (service: ServiceWithCategory) => {
    if (isServiceSelected(service.id)) {
      removeService(service.id);
    } else {
      const defaultPriceType = CATEGORY_PRICE_DEFAULTS[service.category_name] || "starting_from";
      
      const selectedService: SelectedService = {
        serviceId: service.id,
        serviceName: service.name,
        subcategoryId: service.subcategory_id,
        subcategoryName: service.subcategory_name,
        categoryId: service.category_id,
        categoryName: service.category_name,
        customPrice: null,
        priceType: defaultPriceType,
        description: "",
        experienceYears: null,
      };
      addService(selectedService);
    }
  };

  const handleNext = () => {
    if (currentCategoryIndex < totalCategories - 1) {
      setCurrentCategoryIndex(prev => prev + 1);
      setSearchQuery("");
    }
  };

  const handlePrevious = () => {
    if (currentCategoryIndex > 0) {
      setCurrentCategoryIndex(prev => prev - 1);
      setSearchQuery("");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading services...</div>
      </div>
    );
  }

  if (!formData.categoryIds || formData.categoryIds.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please select at least one category first.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress indicator */}
      {totalCategories > 1 && (
        <div className="mb-6 flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Category {currentCategoryIndex + 1} of {totalCategories}
          </span>
          <div className="flex gap-1">
            {formData.categoryIds.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "w-2 h-2 rounded-full",
                  idx === currentCategoryIndex ? "bg-teal-600" : "bg-gray-300"
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          What {currentCategoryName.toLowerCase()} services do you offer?
        </h2>
        <p className="text-gray-500 text-sm">
          Select all that apply. You can pick more than one.
        </p>
        {selectedServicesCount > 0 && (
          <p className="mt-2 text-sm font-medium text-teal-600">
            {selectedServicesCount} selected
          </p>
        )}
        {/* Skip category option */}
        {totalCategories > 1 && (
          <button
            onClick={handleNext}
            className="mt-3 text-sm text-gray-500 hover:text-gray-700 underline"
          >
            I don&apos;t offer {currentCategoryName.toLowerCase()} services
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={`Search ${currentCategoryName.toLowerCase()} services...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Services List */}
      <div className="mb-8">
        {currentCategoryServices.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No services found. Try a different search term.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {currentCategoryServices.map((service) => {
              const isSelected = isServiceSelected(service.id);
              return (
                <label
                  key={service.id}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                    "hover:shadow-sm",
                    isSelected
                      ? "border-teal-600 bg-teal-50"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleService(service)}
                    className="mt-0.5 w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500 focus:ring-2"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-medium text-sm",
                      isSelected ? "text-teal-900" : "text-gray-900"
                    )}>
                      {service.name}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        )}
        {errors.services && (
          <p className="mt-4 text-sm text-red-600">{errors.services}</p>
        )}
      </div>

      {/* Navigation buttons for multiple categories */}
      {totalCategories > 1 && (
        <div className="flex gap-3">
          {currentCategoryIndex > 0 && (
            <button
              onClick={handlePrevious}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              ← Previous category
            </button>
          )}
          {currentCategoryIndex < totalCategories - 1 && (
            <button
              onClick={handleNext}
              className="ml-auto px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700"
            >
              Next: {services.find(s => s.category_id === formData.categoryIds?.[currentCategoryIndex + 1])?.category_name || 'Next category'} services →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
