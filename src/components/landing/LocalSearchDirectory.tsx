import Link from "next/link";
import { localSearches, type LocalSearch } from "@/lib/site/local-searches";
import { HomeIcon } from "./HomeIcons";
import styles from "./HomePage.module.css";

function SearchLinks({ searches }: { searches: LocalSearch[] }) {
  return (
    <ul className={styles.directoryLinks}>
      {searches.map((search) => (
        <li key={search.path}><Link href={search.path} prefetch={false}>{search.title}</Link></li>
      ))}
    </ul>
  );
}

export function LocalSearchDirectory({ expanded = false, available = [] }: {
  expanded?: boolean;
  available?: LocalSearch[];
}) {
  const rentals = localSearches.filter(({ intent }) => intent.kind === "rental");
  const services = localSearches.filter(({ intent }) => intent.kind === "service");
  const groups = [
    { title: "Rental searches", searches: rentals, featured: available.filter(({ intent }) => intent.kind === "rental").slice(0, 4) },
    { title: "Home service searches", searches: services, featured: available.filter(({ intent }) => intent.kind === "service").slice(0, 4) },
  ];

  return (
    <nav aria-label="Local rentals and home services" className={styles.directory}>
      <div className={styles.directoryGrid}>
        {groups.map(({ title, searches, featured }) => (
          <section key={title} className={styles.directoryGroup}>
            <h2>{title}</h2>
            {(expanded || featured.length > 0) && <SearchLinks searches={expanded ? searches : featured} />}
            {!expanded && (
              <details>
                <summary>{featured.length ? "More" : "Browse"} {title.toLowerCase()} <HomeIcon name="chevron" size={18} /></summary>
                <SearchLinks searches={searches.filter(({ path }) => !featured.some((search) => search.path === path))} />
              </details>
            )}
          </section>
        ))}
      </div>
      {!expanded && <Link href="/find" className={styles.textLink}>Open the Kenya search directory <HomeIcon name="arrow" size={17} /></Link>}
    </nav>
  );
}
