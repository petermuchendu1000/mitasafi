/**
 * Portfolio Gallery with Lightbox
 * 
 * Displays a grid of portfolio images that open in a fullscreen
 * lightbox with left/right navigation and thumbnail strip.
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

interface PortfolioGalleryProps {
  images: string[];
  title: string;
}

export function PortfolioGallery({ images, title }: PortfolioGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const lightboxPrev = useCallback(() => {
    setLightboxIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const lightboxNext = useCallback(() => {
    setLightboxIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

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

  if (images.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {images.slice(0, 8).map((url, i) => (
          <button
            key={i}
            onClick={() => openLightbox(i)}
            className="aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-zoom-in"
          >
            <Image
              src={url}
              alt={`Work sample ${i + 1}`}
              width={200}
              height={200}
              sizes="(max-width: 640px) 33vw, 100px"
              className="w-full h-full object-cover hover:scale-105 transition-transform"
            />
          </button>
        ))}
        {images.length > 8 && (
          <button
            onClick={() => openLightbox(8)}
            className="aspect-square rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <span className="text-sm font-medium text-gray-500">
              +{images.length - 8}
            </span>
          </button>
        )}
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
                  {lightboxIndex + 1} / {images.length}
                </span>
              </div>
            </div>
          </div>

          {/* Main image */}
          <div className="absolute inset-0 flex items-center justify-center p-4 pt-20 pb-24">
            <div className="relative w-full h-full max-w-6xl">
              <Image
                src={images[lightboxIndex]}
                alt={`${title} - Photo ${lightboxIndex + 1}`}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>
          </div>

          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
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
            </>
          )}

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex justify-center gap-2 overflow-x-auto pb-2">
                {images.map((url, index) => (
                  <button
                    key={index}
                    onClick={() => setLightboxIndex(index)}
                    className={cn(
                      "relative w-16 h-12 flex-shrink-0 rounded-md overflow-hidden transition-all",
                      index === lightboxIndex
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
