/**
 * Browse Verified Homes Page
 * 
 * Main listings search and browse page for tenants.
 * Features search filters, grid display, and pagination.
 * 
 * Design: 70% teal, 30% orange accents
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import { Navbar, Footer } from "@/components/landing";
import { Container } from "@/components/ui";
import { SearchFilters, ListingsGrid } from "@/components/browse";
import { searchListings, type SearchParams } from "@/lib/listings/search";
import { createClient } from "@/lib/supabase/server";
import { Search, Shield, MapPin, Bell } from "lucide-react";

// Disable caching - always fetch fresh listing data
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Browse Verified Homes | MitaSafi",
  description: "Find your perfect rental home in Nairobi. All listings are verified, no broker fees, and secure payments.",
  openGraph: {
    title: "Browse Verified Homes | MitaSafi",
    description: "Find your perfect rental home in Nairobi. All listings are verified, no broker fees, and secure payments.",
    type: "website",
    url: "https://mitasafi.co.ke/properties",
  },
};

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function BrowsePropertiesPage({ searchParams }: PageProps) {
  // Await searchParams (Next.js 15+)
  const params = await searchParams;

  // Parse search params first (no async needed)
  const parsedParams: SearchParams = {
    area: typeof params.area === "string" ? params.area : undefined,
    propertyType: typeof params.type === "string" ? params.type : undefined,
    minBedrooms: typeof params.beds === "string" ? parseInt(params.beds) || undefined : undefined,
    minPrice: typeof params.minPrice === "string" ? parseInt(params.minPrice) || undefined : undefined,
    maxPrice: typeof params.maxPrice === "string" ? parseInt(params.maxPrice) || undefined : undefined,
    verified: params.verified === "true",
    availableNow: params.available === "true",
    query: typeof params.q === "string" ? params.q : undefined,
    sortBy: (typeof params.sort === "string" ? params.sort : "newest") as SearchParams["sortBy"],
    page: typeof params.page === "string" ? parseInt(params.page) || 1 : 1,
    limit: 12,
  };

  // PERFORMANCE: Parallelize all async operations
  const supabase = await createClient();
  
  // Start all requests in parallel
  const [userResult, listingsResult] = await Promise.all([
    supabase.auth.getUser(),
    searchListings(parsedParams),
  ]);
  
  const user = userResult.data.user;
  const { listings, total, page, totalPages } = listingsResult;
  
  // Only fetch profile if user is authenticated (can't parallelize this one)
  let userPhone: string | undefined;
  if (user) {
    const profileResult = await supabase
      .from("profiles")
      .select("phone")
      .eq("id", user.id)
      .single();
    
    const profileData = profileResult.data as { phone: string | null } | null;
    userPhone = profileData?.phone ?? undefined;
  }

  const userAuth = {
    isAuthenticated: !!user,
    userId: user?.id,
    userEmail: user?.email,
    userPhone,
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50">
        {/* Hero Section with Search */}
        <section className="bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 pt-24 pb-6 lg:pt-28 lg:pb-8">
          <Container>
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
                Find Your Perfect Home
              </h1>
              <p className="text-sm text-brand-100 mb-4">
                Verified rentals across Nairobi. No fake listings. No broker fees.
              </p>

              {/* Search Bar */}
              <form action="/properties" method="GET" className="max-w-2xl mx-auto">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="q"
                    defaultValue={parsedParams.query || ""}
                    placeholder="Search by area, neighborhood, or keyword..."
                    className="w-full pl-12 pr-24 py-3 bg-white rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Search
                  </button>
                </div>
              </form>
            </div>
          </Container>
        </section>

        {/* Filters Only */}
        <section className="bg-white border-b border-gray-200 sticky top-16 z-30 shadow-sm">
          <Container>
            <Suspense fallback={<FiltersSkeleton />}>
              <SearchFilters className="py-3" hideSearch />
            </Suspense>
          </Container>
        </section>

        {/* Listings Grid */}
        <section className="py-6 lg:py-8">
          <Container>
            <Suspense fallback={<GridSkeleton />}>
              <ListingsGrid
                listings={listings}
                total={total}
                page={page}
                totalPages={totalPages}
                userAuth={userAuth}
              />
            </Suspense>
          </Container>
        </section>

        {/* Trust Section */}
        <section className="py-16 bg-white border-t border-gray-200">
          <Container>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Why Trust MitaSafi?
              </h2>
              <p className="text-gray-600">
                Every listing on MitaSafi goes through our verification process
              </p>
            </div>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {TRUST_FEATURES.map((feature, index) => (
                <div
                  key={index}
                  className="text-center p-6"
                >
                  <div className="flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-7 h-7 text-brand-500" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                  <p className="text-sm text-gray-500">{feature.description}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}

// Trust Features Data
const TRUST_FEATURES = [
  {
    icon: Search,
    title: "Smart Filters",
    description: "Find exactly what you need with area, price, and amenity filters",
  },
  {
    icon: Shield,
    title: "Verified Listings",
    description: "Every property is physically verified by our team",
  },
  {
    icon: MapPin,
    title: "Real Photos",
    description: "Actual photos taken during our verification visits",
  },
  {
    icon: Bell,
    title: "No Hidden Fees",
    description: "What you see is what you pay. No broker fees ever.",
  },
];

// Loading Skeletons
function FiltersSkeleton() {
  return (
    <div className="py-4 flex items-center gap-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-10 w-28 bg-gray-100 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm">
          <div className="aspect-[4/3] bg-gray-200 animate-pulse" />
          <div className="p-4 space-y-3">
            <div className="h-5 bg-gray-200 rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
