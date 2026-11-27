import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/landing";
import { HomeIcon } from "@/components/landing/HomeIcons";
import { HomeNavbar } from "@/components/landing/HomeNavbar";
import { homeFont } from "@/components/landing/home-font";
import homeStyles from "@/components/landing/HomePage.module.css";
import { ListingsGrid, SearchFilters } from "@/components/browse";
import { searchListings, type SearchParams } from "@/lib/listings/search";
import { createClient } from "@/lib/supabase/server";
import { areaLabel, findMarketplaceArea } from "@/lib/site/marketplace";
import { findPlace } from "@/lib/site/places";
import { siteUrl } from "@/lib/site/urls";
import styles from "./rentals.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const title = "Apartments, Bedsitters & Houses for Rent in Kenya | MitaSafi";
const description = "Browse rental homes across Kenya by town, neighbourhood, rent and bedroom count. Save listings and contact landlords about availability and viewings.";

export const metadata: Metadata = {
  title,
  description,
  keywords: null,
  alternates: { canonical: siteUrl("/properties") },
  openGraph: { title, description, type: "website", url: siteUrl("/properties") },
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function numeric(value: string | string[] | undefined) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return undefined;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : undefined;
}

export default async function BrowsePropertiesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const location = findPlace(typeof params.location === "string" ? params.location : undefined);
  const exactBedrooms = numeric(params.bedrooms);
  const minimumBedrooms = numeric(params.beds);
  const priceRange = typeof params.price === "string" ? /^(\d+)(?:-(\d+)|\+)$/.exec(params.price) : null;
  const criteria: SearchParams = {
    area: typeof params.area === "string" ? params.area : undefined,
    locationAreas: location?.areas,
    currency: params.currency === "KES" ? "KES" : undefined,
    residentialOnly: params.residential === "1",
    propertyType: typeof params.type === "string" ? params.type : undefined,
    minBedrooms: exactBedrooms ?? minimumBedrooms,
    maxBedrooms: exactBedrooms ?? (minimumBedrooms === 0 ? 0 : undefined),
    minPrice: numeric(params.minPrice) ?? numeric(priceRange?.[1]),
    maxPrice: numeric(params.maxPrice) ?? numeric(priceRange?.[2]),
    verified: params.verified === "true",
    availableNow: params.available === "true",
    query: typeof params.q === "string" ? params.q.trim() || undefined : undefined,
    sortBy: params.sort === "price_low" || params.sort === "price_high" || params.sort === "popular"
      ? params.sort : "newest",
    page: Math.max(numeric(params.page) ?? 1, 1),
    limit: 12,
  };

  const supabase = await createClient();
  const [{ data: { user } }, result] = await Promise.all([
    supabase.auth.getUser(),
    searchListings(criteria, supabase),
  ]);
  const profile = user ? await supabase.from("profiles").select("phone").eq("id", user.id).single() : null;
  const userAuth = {
    isAuthenticated: Boolean(user),
    userId: user?.id,
    userEmail: user?.email,
    userPhone: (profile?.data as { phone: string | null } | null | undefined)?.phone ?? undefined,
  };

  const serviceArea = findMarketplaceArea(criteria.area);
  const locationName = location?.name ?? (serviceArea ? areaLabel(serviceArea) : criteria.area);
  const serviceHref = {
    pathname: "/services/browse",
    query: location ? { location: location.slug } : serviceArea ? { area: serviceArea } : {},
  };

  return (
    <div className={`${homeFont.variable} ${homeStyles.home} ${styles.page}`}>
      <a href="#rental-results" className={homeStyles.skipLink}>Skip to rental results</a>
      <HomeNavbar activePage="rentals" />
      <main>
        <section className={styles.intro} aria-labelledby="rentals-title">
          <div className={styles.wrap}>
            <nav className={styles.breadcrumb} aria-label="Breadcrumb">
              <Link href="/">Home</Link><span aria-hidden="true">/</span>
              <span aria-current="page">Rentals</span>
            </nav>
            <div className={styles.introLayout}>
              <div className={styles.introText}>
                <h1 id="rentals-title">{locationName ? `Rentals in ${locationName}` : "Find your next home in Kenya"}</h1>
                <p>Browse apartments, bedsitters and houses for rent.</p>
              </div>
              <form action="/properties" method="GET" className={styles.search} role="search" aria-label="Search rentals">
                {Object.entries(params).map(([key, value]) => (
                  key !== "q" && key !== "page" && typeof value === "string" && value
                    ? <input key={key} type="hidden" name={key} value={value} />
                    : null
                ))}
                <HomeIcon name="search" size={21} />
                <label className={styles.srOnly} htmlFor="rental-keyword">Neighbourhood or keyword</label>
                <input key={criteria.query} id="rental-keyword" name="q" type="search" defaultValue={criteria.query}
                  placeholder="Neighbourhood or keyword" enterKeyHint="search" maxLength={160} />
                <button type="submit" className={styles.primary}>Search</button>
              </form>
            </div>
          </div>
        </section>

        <div className={styles.wrap}>
          <SearchFilters />
          <ListingsGrid {...result} criteria={criteria} userAuth={userAuth} />
          <section className={styles.resources} aria-labelledby="rental-resources">
            <h2 id="rental-resources" className={styles.srOnly}>Rental resources</h2>
            <Link href="/find">
              <HomeIcon name="pin" size={23} />
              <span><strong>Explore places</strong><small>Find rentals by town or neighbourhood.</small></span>
              <HomeIcon name="arrow" size={17} />
            </Link>
            <Link href="/guides/tenants">
              <HomeIcon name="key" size={23} />
              <span><strong>Tenant guide</strong><small>What to ask before you rent.</small></span>
              <HomeIcon name="arrow" size={17} />
            </Link>
            <Link href={serviceHref}>
              <HomeIcon name="tools" size={23} />
              <span><strong>{locationName ? `Home services in ${locationName}` : "Find home services"}</strong><small>Find movers, cleaners and repair pros.</small></span>
              <HomeIcon name="arrow" size={17} />
            </Link>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
