/**
 * Services Hero Component
 * 
 * Hero banner for the services page with search.
 * Design: Full-width gradient background with teal/brand colors.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Sparkles, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface ServicesHeroProps {
  className?: string;
}

export function ServicesHero({ className }: ServicesHeroProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/services/browse?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };
  
  return (
    <section
      className={cn(
        "relative bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 overflow-hidden",
        className
      )}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg
          className="absolute h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="services-pattern"
              width="60"
              height="60"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M30 0L60 30L30 60L0 30Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#services-pattern)" />
        </svg>
      </div>
      
      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-sm text-white/90 mb-6">
            <Sparkles className="w-4 h-4" />
            <span>Trusted by thousands of tenants in Nairobi</span>
          </div>
          
          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Find Trusted Service Providers
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8">
            Moving, cleaning, repairs, and more. Compare verified providers,
            read reviews, and get quotes - all in one place.
          </p>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for services (e.g., movers, cleaners, plumbers...)"
                className="w-full pl-14 pr-32 py-4 bg-white rounded-2xl text-gray-900 placeholder:text-gray-400 shadow-lg focus:outline-none focus:ring-4 focus:ring-white/30 transition-all"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors shadow-md"
              >
                Search
              </button>
            </div>
          </form>
          
          {/* Trust Signals */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-white/80 text-sm">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-white/70" />
              <span>Verified Providers</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-cta-400" />
              <span>Instant Booking</span>
            </div>
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-warning-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span>4.8+ Average Rating</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1440 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
          preserveAspectRatio="none"
        >
          <path
            d="M0 48h1440V24c-120 12-240 18-360 18s-240-6-360-18-240-18-360-18-240 6-360 18v24z"
            fill="#f9fafb"
          />
        </svg>
      </div>
    </section>
  );
}
