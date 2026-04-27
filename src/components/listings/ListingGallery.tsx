/**
 * Listing Gallery Component
 * 
 * Responsive photo gallery with:
 * - Carousel on mobile (swipeable)
 * - Grid on desktop (click to lightbox)
 * - Fullscreen lightbox with category tabs
 * 
 * Theme: 70% Teal, 30% Orange
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Expand,
  Camera,
  Home,
  Bed,
  UtensilsCrossed,
  Bath,
  Building2,
  Dumbbell,
  ImageIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ListingPhoto } from "@/lib/listings/types";

interface ListingGalleryProps {
  photos: ListingPhoto[];
  title: string;
  isVerified?: boolean;
}

const CATEGORY_ICONS: Record<ListingPhoto["category"], React.ReactNode> = {
  cover: <Home className="w-4 h-4" />,
  living: <Home className="w-4 h-4" />,
  bedroom: <Bed className="w-4 h-4" />,
  kitchen: <UtensilsCrossed className="w-4 h-4" />,
  bathroom: <Bath className="w-4 h-4" />,
  exterior: <Building2 className="w-4 h-4" />,
  amenity: <Dumbbell className="w-4 h-4" />,
  extra: <ImageIcon className="w-4 h-4" />,
};

const CATEGORY_LABELS: Record<ListingPhoto["category"], string> = {
  cover: "Cover",
  living: "Living",
  bedroom: "Bedroom",
  kitchen: "Kitchen",
  bathroom: "Bathroom",
  exterior: "Exterior",
  amenity: "Amenities",
  extra: "Other",
};

export function ListingGallery({ photos, title, isVerified }: ListingGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<ListingPhoto["category"] | "all">("all");

  // Sort photos by sort_order
  const sortedPhotos = [...photos].sort((a, b) => a.sort_order - b.sort_order);
  
  // Get unique categories for filter tabs
  const categories = Array.from(new Set(sortedPhotos.map(p => p.category)));
  
  // Filter photos by category
  const filteredPhotos = activeCategory === "all" 
    ? sortedPhotos 
    : sortedPhotos.filter(p => p.category === activeCategory);

  // Navigation handlers
  const goToPrevious = useCallback(() => {
    setCurrentIndex(prev => (prev === 0 ? sortedPhotos.length - 1 : prev - 1));
  }, [sortedPhotos.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev === sortedPhotos.length - 1 ? 0 : prev + 1));
  }, [sortedPhotos.length]);

  // Lightbox navigation
  const lightboxPrev = useCallback(() => {
    setLightboxIndex(prev => (prev === 0 ? filteredPhotos.length - 1 : prev - 1));
  }, [filteredPhotos.length]);

  const lightboxNext = useCallback(() => {
    setLightboxIndex(prev => (prev === filteredPhotos.length - 1 ? 0 : prev + 1));
  }, [filteredPhotos.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxOpen) {
        if (e.key === "ArrowLeft") lightboxPrev();
        if (e.key === "ArrowRight") lightboxNext();
        if (e.key === "Escape") setLightboxOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, lightboxPrev, lightboxNext]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [lightboxOpen]);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setActiveCategory("all");
    setLightboxOpen(true);
  };

  if (photos.length === 0) {
    return (
      <div className="relative aspect-[4/3] md:aspect-[16/9] bg-gray-100 rounded-xl flex items-center justify-center">
        <div className="text-center text-gray-400">
          <Camera className="w-12 h-12 mx-auto mb-2" />
          <p>No photos available</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: Carousel */}
      <div className="md:hidden relative">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-100">
          <Image
            src={sortedPhotos[currentIndex]?.url || "/images/placeholder-property.jpg"}
            alt={`${title} - Photo ${currentIndex + 1}`}
            fill
            className="object-cover"
            priority={currentIndex === 0}
            sizes="100vw"
            unoptimized
          />
          
          {/* Verified badge */}
          {isVerified && (
            <div className="absolute top-3 left-3 bg-brand-600 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Verified
            </div>
          )}

          {/* Navigation arrows */}
          <button
            onClick={goToPrevious}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors"
            aria-label="Previous photo"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors"
            aria-label="Next photo"
          >
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>

          {/* Photo counter & expand button */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <span className="bg-black/60 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">
              {currentIndex + 1} / {sortedPhotos.length}
            </span>
            <button
              onClick={() => openLightbox(currentIndex)}
              className="bg-black/60 text-white p-2 rounded-full backdrop-blur-sm hover:bg-black/80 transition-colors"
              aria-label="View all photos"
            >
              <Expand className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dots indicator */}
        <div className="flex justify-center gap-1.5 mt-3">
          {sortedPhotos.slice(0, 7).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                index === currentIndex 
                  ? "bg-brand-600 w-4" 
                  : "bg-gray-300 hover:bg-gray-400"
              )}
              aria-label={`Go to photo ${index + 1}`}
            />
          ))}
          {sortedPhotos.length > 7 && (
            <span className="text-xs text-gray-400 ml-1">+{sortedPhotos.length - 7}</span>
          )}
        </div>
      </div>

      {/* Desktop: Grid */}
      <div className="hidden md:block">
        <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[400px] lg:h-[480px] rounded-xl overflow-hidden">
          {/* Main large image */}
          <button
            onClick={() => openLightbox(0)}
            className="col-span-2 row-span-2 relative group cursor-pointer overflow-hidden"
          >
            <Image
              src={sortedPhotos[0]?.url || "/images/placeholder-property.jpg"}
              alt={`${title} - Main photo`}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              priority
              sizes="50vw"
              unoptimized
            />
            {isVerified && (
              <div className="absolute top-4 left-4 bg-brand-600 text-white px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 z-10">
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Verified
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </button>

          {/* Secondary images */}
          {sortedPhotos.slice(1, 5).map((photo, index) => (
            <button
              key={photo.id}
              onClick={() => openLightbox(index + 1)}
              className="relative group cursor-pointer overflow-hidden"
            >
              <Image
                src={photo.url}
                alt={`${title} - Photo ${index + 2}`}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                sizes="25vw"
                unoptimized
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              
              {/* Show "+X more" on last visible image */}
              {index === 3 && sortedPhotos.length > 5 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white text-lg font-semibold">
                    +{sortedPhotos.length - 5} more
                  </span>
                </div>
              )}
            </button>
          ))}

          {/* Fill empty slots with placeholder if less than 5 photos */}
          {sortedPhotos.length < 5 && 
            Array.from({ length: 5 - sortedPhotos.length }).map((_, index) => (
              <div 
                key={`empty-${index}`} 
                className="bg-gray-100 flex items-center justify-center"
              >
                <Camera className="w-8 h-8 text-gray-300" />
              </div>
            ))
          }
        </div>

        {/* View all photos button */}
        <button
          onClick={() => openLightbox(0)}
          className="mt-3 inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 font-medium transition-colors"
        >
          <Camera className="w-4 h-4" />
          View all {sortedPhotos.length} photos
        </button>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setLightboxOpen(false)}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
                <span className="text-white font-medium">
                  {lightboxIndex + 1} / {filteredPhotos.length}
                </span>
              </div>
              
              {/* Category tabs */}
              <div className="hidden md:flex items-center gap-1 bg-white/10 rounded-full p-1">
                <button
                  onClick={() => setActiveCategory("all")}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                    activeCategory === "all" 
                      ? "bg-brand-600 text-white" 
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  )}
                >
                  All
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => {
                      setActiveCategory(cat);
                      setLightboxIndex(0);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5",
                      activeCategory === cat 
                        ? "bg-brand-600 text-white" 
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    )}
                  >
                    {CATEGORY_ICONS[cat]}
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main image */}
          <div className="absolute inset-0 flex items-center justify-center p-4 pt-20 pb-24">
            <div className="relative w-full h-full max-w-6xl">
              <Image
                src={filteredPhotos[lightboxIndex]?.url || ""}
                alt={`${title} - Photo ${lightboxIndex + 1}`}
                fill
                className="object-contain"
                sizes="100vw"
                priority
                unoptimized
              />
            </div>
          </div>

          {/* Navigation arrows */}
          <button
            onClick={lightboxPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={lightboxNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>

          {/* Thumbnail strip */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="flex justify-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {filteredPhotos.map((photo, index) => (
                <button
                  key={photo.id}
                  onClick={() => setLightboxIndex(index)}
                  className={cn(
                    "relative w-16 h-12 flex-shrink-0 rounded-md overflow-hidden transition-all",
                    index === lightboxIndex 
                      ? "ring-2 ring-cta-500 ring-offset-2 ring-offset-black" 
                      : "opacity-60 hover:opacity-100"
                  )}
                >
                  <Image
                    src={photo.url}
                    alt={`Thumbnail ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="64px"
                    unoptimized
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ListingGallery;
