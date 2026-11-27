import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import styles from "@/components/landing/HomePage.module.css";
import { HomeIcon } from "@/components/landing/HomeIcons";
import { getLocalInventory } from "@/lib/site/local-search-inventory";
import { jujaBedsitterBudgetHref, localSearches, resolveLocalSearch } from "@/lib/site/local-searches";
import { siteUrl } from "@/lib/site/urls";

interface PageProps {
  params: Promise<{ place: string; intent: string }>;
}

const loadLocalSearch = cache(async (place: string, intent: string) => {
  const search = resolveLocalSearch(place, intent);
  if (!search) notFound();
  return { search, ...await getLocalInventory(search) };
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const route = await params;
  const { search, status } = await loadLocalSearch(route.place, route.intent);
  const title = `${search.title} | MitaSafi`;
  const description = search.priorityContent?.summary ?? (search.intent.kind === "rental"
    ? `Browse ${search.intent.label.toLowerCase()} in ${search.place.name}. Compare rent and property details, then contact the landlord to arrange a viewing.`
    : `Find ${search.intent.label.toLowerCase()} in ${search.place.name}. Compare local provider profiles and confirm coverage for your address.`);
  const canonical = siteUrl(search.path);
  return {
    title,
    description,
    keywords: null,
    alternates: { canonical },
    robots: { index: status === "available", follow: true },
    openGraph: { title, description, url: canonical, type: "website", locale: "en_KE" },
    twitter: { card: "summary", title, description },
  };
}

export default async function LocalSearchPage({ params }: PageProps) {
  const route = await params;
  const { search, results, status } = await loadLocalSearch(route.place, route.intent);
  const place = search.place.slug;
  const isRental = search.intent.kind === "rental";
  const target = isRental ? "/services/browse" : "/properties";
  const related = localSearches.filter((item) => item.place.slug === place && item.path !== search.path);
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl("/") },
      { "@type": "ListItem", position: 2, name: "Kenya search directory", item: siteUrl("/find") },
      { "@type": "ListItem", position: 3, name: search.title, item: siteUrl(search.path) },
    ],
  };

  return (
    <main id="main-content" className={styles.localPage}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs).replace(/</g, "\\u003c") }} />
      <div className={styles.wrap}>
        <nav aria-label="Breadcrumb" className={styles.heroLinks}>
          <Link href="/">Home</Link>
          <Link href="/find">Kenya search directory</Link>
        </nav>
        {search.place.county && <p className={styles.location}>{search.place.county} County</p>}
        <h1>{search.title}</h1>
        <p>{search.priorityContent?.summary ?? search.intent.advice}</p>
        <div className={styles.partnerActions}>
          <Link href={search.browseHref} className={styles.primaryLink}>{isRental ? "Open rental search" : "Open service search"}</Link>
          <Link href={{ pathname: target, query: { location: place, ...(!isRental && { residential: "1" }) } }} className={styles.outlineButton}>
            {isRental ? "Home services" : "Rentals"} in {search.place.name}
          </Link>
        </div>
        {search.path === "/find/juja/cheap-bedsitters" && (
          <Link href={jujaBedsitterBudgetHref} prefetch={false} className={styles.textLink}>
            Juja bedsitters up to KES 5,000 <HomeIcon name="arrow" size={16} />
          </Link>
        )}

        <section className={styles.localResults} aria-labelledby="matching-results">
          <h2 id="matching-results">{isRental ? "Matching rentals" : "Matching providers"}</h2>
          {results.length > 0 ? (
            <ul className={styles.serviceList}>
              {results.map(({ title, href, detail }) => (
                <li key={href}>
                  <Link href={href} prefetch={false}>
                    <HomeIcon name={isRental ? "home" : "tools"} size={21} className={styles.serviceIcon} />
                    <span><strong>{title}</strong>{detail && <small>{detail}</small>}</span>
                    <HomeIcon name="arrow" size={17} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>{status === "unavailable" ? "We couldn’t load results right now. Try again shortly." : "There are no matching results right now. Try a broader location or a different search."}</p>
          )}
        </section>

        {(search.priorityContent || search.localAdvice) && (
          <section className={styles.localResults}>
            <h2>{search.priorityContent?.heading ?? `Planning around ${search.place.name}`}</h2>
            <p>{search.priorityContent?.detail ?? search.localAdvice}</p>
          </section>
        )}
        {related.length > 0 && (
          <nav aria-label="Related searches" className={styles.localResults}>
            <h2>More searches in {search.place.name}</h2>
            <ul className={styles.directoryLinks}>
              {related.map((item) => <li key={item.path}><Link href={item.path} prefetch={false}>{item.title}</Link></li>)}
            </ul>
          </nav>
        )}
      </div>
    </main>
  );
}
