/**
 * Service Image Gallery — Fiverr-style Main Image + Thumbnails
 *
 * Renders a large hero image with thumbnail strip below. Clicking a
 * thumbnail swaps the main image. Clicking the main image opens a
 * fullscreen lightbox with keyboard navigation (← → Esc).
 *
 * Falls back gracefully when no images are provided (handled by parent).
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ServiceImageGalleryProps {
  images: string[];
  title: string;
}

export function ServiceImageGallery({ images, title }: ServiceImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [errorIndexes, setErrorIndexes] = useState<Set<number>>(new Set());

  const validImages = images.filter((_, i) => !errorIndexes.has(i));

  const goTo = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  const prev = useCallback(() => {
    setActiveIndex((i) => (i === 0 ? validImages.length - 1 : i - 1));
  }, [validImages.length]);

  const next = useCallback(() => {
    setActiveIndex((i) => (i === validImages.length - 1 ? 0 : i + 1));
  }, [validImages.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxOpen) {
        if (e.key === "ArrowLeft") prev();
        if (e.key === "ArrowRight") next();
        if (e.key === "Escape") setLightboxOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, prev, next]);

  // Lock scroll when lightbox is open
  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [lightboxOpen]);

  if (validImages.length === 0) return null;

  return (
    <>
      {/* Main Image */}
      <div
        className="relative w-full aspect-[16/9] sm:aspect-[16/10] rounded-xl overflow-hidden bg-gray-100 cursor-zoom-in group"
        onClick={() => setLightboxOpen(true)}
      >
        <Image
          src={validImages[activeIndex]}
          alt={`${title} – image ${activeIndex + 1}`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 70vw, 680px"
          className="object-cover"
          priority
          onError={() => {
            setErrorIndexes((prev) => new Set(prev).add(images.indexOf(validImages[activeIndex])));
            setActiveIndex(0);
          }}
        />

        {/* Image counter badge */}
        {validImages.length > 1 && (
          <span className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/60 text-white text-xs font-medium rounded-md">
            {activeIndex + 1} / {validImages.length}
          </span>
        )}

        {/* Hover arrows on main image */}
        {validImages.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail Strip */}
      {validImages.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {validImages.map((url, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={cn(
                "relative w-16 h-12 sm:w-20 sm:h-14 flex-shrink-0 rounded-lg overflow-hidden transition-all",
                i === activeIndex
                  ? "ring-2 ring-teal-500 opacity-100"
                  : "opacity-60 hover:opacity-100"
              )}
            >
              <Image
                src={url}
                alt={`Thumbnail ${i + 1}`}
                fill
                className="object-cover"
                sizes="80px"
                onError={() => {
                  setErrorIndexes((prev) => new Set(prev).add(images.indexOf(url)));
                }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Lightbox */}
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
                  {activeIndex + 1} / {validImages.length}
                </span>
              </div>
            </div>
          </div>

          {/* Main image */}
          <div className="absolute inset-0 flex items-center justify-center p-4 pt-20 pb-24">
            <div className="relative w-full h-full max-w-6xl">
              <Image
                src={validImages[activeIndex]}
                alt={`${title} – Photo ${activeIndex + 1}`}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>
          </div>

          {/* Navigation arrows */}
          {validImages.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={next}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </>
          )}

          {/* Thumbnail strip */}
          {validImages.length > 1 && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex justify-center gap-2 overflow-x-auto pb-2">
                {validImages.map((url, index) => (
                  <button
                    key={index}
                    onClick={() => goTo(index)}
                    className={cn(
                      "relative w-16 h-12 flex-shrink-0 rounded-md overflow-hidden transition-all",
                      index === activeIndex
                        ? "ring-2 ring-teal-500 ring-offset-2 ring-offset-black"
                        : "opacity-60 hover:opacity-100"
                    )}
                  >
                    <Image
                      src={url}
                      alt={`Thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
