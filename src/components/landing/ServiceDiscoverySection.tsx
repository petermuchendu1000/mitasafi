// =============================================================================
// MITASAFI: SERVICE DISCOVERY SECTION
// =============================================================================
// A dedicated services discovery section with search bar for landing page.
// Fiverr-style: "Find the right service for your property"
// =============================================================================

"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/ui";
import { 
  Search, 
  ArrowRight, 
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle
} from "lucide-react";

// =============================================================================
// TRENDING SEARCHES
// =============================================================================

const TRENDING_SEARCHES = [
  "Plumber",
  "Electrician", 
  "House cleaning",
  "Moving services",
  "Security guard",
  "Interior designer",
  "Property manager",
  "Lawyer",
];

// =============================================================================
// SEARCH BAR COMPONENT
// =============================================================================

function ServiceSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = useCallback((searchQuery?: string) => {
    const q = searchQuery || query;
    if (q.trim()) {
      router.push(`/services/browse?search=${encodeURIComponent(q.trim())}`);
    } else {
      router.push("/services/browse");
    }
  }, [query, router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="relative max-w-2xl mx-auto">
      {/* Search Input Container */}
      <div 
        className={`
          relative flex items-center bg-white rounded-full shadow-lg
          transition-all duration-200
          ${isFocused ? "ring-2 ring-brand-500 shadow-xl" : "hover:shadow-xl"}
        `}
      >
        <div className="pl-5">
          <Search className="w-5 h-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder='Try "plumber", "electrician", or "cleaning"'
          className="flex-1 px-4 py-4 text-gray-900 placeholder-gray-500 bg-transparent border-none focus:outline-none text-base"
        />
        <button
          onClick={() => handleSearch()}
          className="m-1.5 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-full transition-colors flex items-center gap-2"
        >
          <span className="hidden sm:inline">Search</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Trending Searches */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <span className="flex items-center gap-1 text-sm text-gray-500">
          <TrendingUp className="w-4 h-4" />
          Popular:
        </span>
        {TRENDING_SEARCHES.slice(0, 5).map((term) => (
          <button
            key={term}
            onClick={() => {
              setQuery(term);
              handleSearch(term);
            }}
            className="px-3 py-1 text-sm text-gray-600 bg-white/80 hover:bg-white hover:text-brand-600 rounded-full border border-gray-200 hover:border-brand-300 transition-colors"
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// STATS
// =============================================================================

const STATS = [
  { value: "700+", label: "Services" },
  { value: "500+", label: "Verified Providers" },
  { value: "50k+", label: "Jobs Completed" },
  { value: "4.8", label: "Avg. Rating" },
];

// =============================================================================
// MAIN SECTION
// =============================================================================

export function ServiceDiscoverySection() {
  return (
    <section className="relative py-20 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800" />
      <div className="absolute inset-0 bg-[url('/images/pattern-dots.svg')] opacity-10" />
      
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <Container className="relative z-10">
        {/* Content */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-white/90 text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            Find trusted service providers for your property
          </div>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Need a Service Provider?
          </h2>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Search from over 700 services. Verified professionals. Transparent pricing. 
            Quality guaranteed.
          </p>
        </div>

        {/* Search Bar */}
        <ServiceSearchBar />

        {/* Trust Points */}
        <div className="mt-10 flex flex-wrap justify-center gap-6 text-white/80 text-sm">
          <span className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            All providers verified
          </span>
          <span className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            Secure payments
          </span>
          <span className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            24/7 support
          </span>
        </div>

        {/* Stats */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((stat) => (
            <div 
              key={stat.label}
              className="text-center p-4 bg-white/10 backdrop-blur-sm rounded-xl"
            >
              <div className="text-2xl sm:text-3xl font-bold text-white">
                {stat.value}
              </div>
              <div className="text-sm text-white/70">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <Link
            href="/services/browse"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-brand-600 font-semibold rounded-full hover:bg-gray-50 transition-colors shadow-lg"
          >
            Browse All Services
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </Container>
    </section>
  );
}
