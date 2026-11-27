import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Footer } from "@/components/landing/Footer";
import { HomeIcon } from "@/components/landing/HomeIcons";
import { HomeNavbar } from "@/components/landing/HomeNavbar";
import { homeFont } from "@/components/landing/home-font";
import homeStyles from "@/components/landing/HomePage.module.css";
import { CompareBar, CompareProvidersProvider } from "@/components/services/CompareProviders";
import { ProviderCard } from "@/components/services/ProviderCard";
import { ServiceSearchAutocomplete } from "@/components/services/ServiceSearchAutocomplete";
import { PROVIDERS_PER_PAGE, SERVICE_CATEGORIES } from "@/lib/constants";
import { getCategoriesWithSubs } from "@/lib/services/categories";
import { getProviders } from "@/lib/services/providers";
import { areaLabel, findMarketplaceArea } from "@/lib/site/marketplace";
import { siteUrl } from "@/lib/site/urls";
import { BrowseControls } from "./BrowseControls";
import { browseHref, locationParams, parseBrowseFilters } from "./filters";
import styles from "./browse.module.css";

const title = "Compare Home Service Providers in Kenya | MitaSafi";
const description = "Browse movers, cleaners, plumbers and electricians in Kenya by town or neighbourhood. Compare profiles, services and reviews before requesting a job.";
const canonical = siteUrl("/services/browse");

export const metadata: Metadata = {
  title,
  description,
  keywords: null,
  alternates: { canonical },
  openGraph: { title, description, type: "website", url: canonical },
};

const quickCategories = [
  { value: "", label: "All services", icon: "home" },
  { value: "moving", label: "Moving", icon: "truck" },
  { value: "cleaning", label: "Cleaning", icon: "brush" },
  { value: "plumbing", label: "Plumbing", icon: "plumbing" },
  { value: "electrical", label: "Electrical", icon: "bolt" },
  { value: "painting", label: "Painting", icon: "brush" },
  { value: "repairs", label: "Repairs", icon: "tools" },
] as const;

type RawSearch = Record<string, string | string[] | undefined>;

function linkToPage(params: URLSearchParams, page: number) {
  const next = new URLSearchParams(params);
  if (page > 1) next.set("page", String(page));
  else next.delete("page");
  return browseHref(next, "#provider-results");
}

export default async function ServicesBrowsePage({ searchParams }: { searchParams: Promise<RawSearch> }) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string" && value) params.set(key, value);
  }
  const { filters, page, areas, location } = parseBrowseFilters(params);
  const [result, categories] = await Promise.all([
    getProviders({ filters, page, pageSize: PROVIDERS_PER_PAGE }),
    getCategoriesWithSubs(),
  ]);
  const { providers, pagination, error } = result;
  const area = areas.length === 1 ? findMarketplaceArea(areas[0]) ?? areas[0] : undefined;
  const placeName = location?.name ?? (area ? areaLabel(area) : undefined);
  const rentalHref = {
    pathname: "/properties",
    query: location ? { location: location.slug, residential: "1" }
      : area ? { area, residential: "1" } : { residential: "1" },
  };
  const selectedCategory = quickCategories.find((item) => item.value === filters.category)?.label
    ?? SERVICE_CATEGORIES.find((item) => item.id === filters.category)?.name
    ?? categories.find((item) => item.slug === filters.category)?.name;
  const scoped = locationParams(params);
  const filtered = params.toString() !== scoped.toString();

  return (
    <CompareProvidersProvider>
      <div className={`${homeFont.variable} ${homeStyles.home} ${styles.page}`}>
        <a className={homeStyles.skipLink} href="#provider-results">Skip to service providers</a>
        <HomeNavbar activePage="services" />
        <main>
          <section className={styles.intro} aria-labelledby="services-title">
            <div className={styles.wrap}>
              <nav className={styles.breadcrumb} aria-label="Breadcrumb">
                <Link href="/">Home</Link><span aria-hidden="true">/</span>
                <Link href="/services">Home services</Link><span aria-hidden="true">/</span>
                <span aria-current="page">Browse</span>
              </nav>
              <div className={styles.introLayout}>
                <div>
                  <h1 id="services-title">{placeName ? `Home services in ${placeName}` : "Find home services in Kenya"}</h1>
                  <p>Compare local cleaners, movers and fundis.</p>
                </div>
                <ServiceSearchAutocomplete key={filters.search} variant="browse" placeholder="Try “house cleaning”"
                  showPopularOnFocus className={styles.search} />
              </div>
            </div>
          </section>

          <div className={styles.wrap}>
            <nav className={styles.categories} aria-label="Service categories">
              <ul role="list">
                {quickCategories.map(({ label, value, icon }) => {
                  const next = new URLSearchParams(params);
                  for (const key of ["category", "subcategory", "services", "q", "page"]) next.delete(key);
                  if (value) next.set("category", value);
                  return (
                    <li key={value}>
                      <Link href={browseHref(next)} aria-current={value === (filters.category ?? "") ? "page" : undefined}
                        scroll={false} prefetch={false}><HomeIcon name={icon} size={19} /> {label}</Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <BrowseControls categories={categories} />

            <section className={styles.results} id="provider-results" tabIndex={-1} aria-labelledby="provider-results-title">
              <div className={styles.resultsHeader}>
                <h2 id="provider-results-title">{filters.search ? `Results for “${filters.search}”` : selectedCategory ?? "Service providers"}</h2>
                <p role="status">{error ? "Results unavailable" : `${pagination.total.toLocaleString("en-KE")} ${pagination.total === 1 ? "provider" : "providers"}`}</p>
              </div>
              {error || providers.length === 0 ? (
                <div className={styles.empty}>
                  <HomeIcon name={error ? "tools" : "search"} size={30} />
                  <h3>{error ? "We couldn’t load providers" : pagination.total ? "No providers on this page" : placeName ? `No matching providers in ${placeName}` : "No matching providers"}</h3>
                  <p>{error ? "Try again in a moment." : pagination.total ? "Return to the first page to see the results." : "Try another service or nearby location."}</p>
                  {error ? <a className={styles.outlineButton} href={browseHref(params, "#provider-results")}>Try again</a>
                    : pagination.total ? <Link className={styles.outlineButton} href={linkToPage(params, 1)}>Back to page 1</Link>
                      : filtered ? <Link className={styles.outlineButton} href={browseHref(scoped, "#provider-results")}>Reset filters</Link>
                        : <Link className={styles.outlineButton} href={scoped.size ? "/services/browse" : "/find"}>{scoped.size ? "Browse across Kenya" : "Explore services by location"}</Link>}
                </div>
              ) : (
                <>
                  <ul key={params.toString()} className={styles.cards} aria-label="Service providers" role="list">
                    {providers.map((provider, index) => (
                      <li key={provider.id}><ProviderCard provider={provider} variant="marketplace"
                        priority={index === 0} eagerImage={index < 3} /></li>
                    ))}
                  </ul>
                  {pagination.totalPages > 1 && (
                    <nav className={styles.pagination} aria-label="Service provider pages">
                      {page > 1
                        ? <Link rel="prev" href={linkToPage(params, page - 1)} aria-label="Previous page"><ChevronLeft size={17} aria-hidden="true" /> Previous</Link>
                        : <span className={styles.inactive}><ChevronLeft size={17} aria-hidden="true" /> Previous</span>}
                      <span aria-current="page">Page {page} of {pagination.totalPages}</span>
                      {page < pagination.totalPages
                        ? <Link rel="next" href={linkToPage(params, page + 1)} aria-label="Next page">Next <ChevronRight size={17} aria-hidden="true" /></Link>
                        : <span className={styles.inactive}>Next <ChevronRight size={17} aria-hidden="true" /></span>}
                    </nav>
                  )}
                </>
              )}
            </section>

            <section className={styles.resources} aria-label="Related links">
              <Link href={rentalHref}><HomeIcon name="home" size={23} />
                <span>{placeName ? `Browse rentals in ${placeName}` : "Browse rentals in Kenya"}</span><HomeIcon name="arrow" size={17} /></Link>
              <Link href="/find"><HomeIcon name="pin" size={23} />
                <span>Explore rentals and services by location</span><HomeIcon name="arrow" size={17} /></Link>
            </section>
          </div>
        </main>
        <Footer />
        <CompareBar className={styles.compareBar} />
      </div>
    </CompareProvidersProvider>
  );
}
