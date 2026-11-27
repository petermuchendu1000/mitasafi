"use client";

import Link from "next/link";
import { HomeIcon } from "@/components/landing/HomeIcons";
import { HomeNavbar } from "@/components/landing/HomeNavbar";
import { homeFont } from "@/components/landing/home-font";
import homeStyles from "@/components/landing/HomePage.module.css";
import styles from "./browse.module.css";

export default function ServicesBrowseError({ reset }: { reset: () => void }) {
  return (
    <div className={`${homeFont.variable} ${homeStyles.home} ${styles.page}`}>
      <HomeNavbar activePage="services" />
      <main className={`${styles.wrap} ${styles.results}`}>
        <div className={styles.empty}>
          <HomeIcon name="tools" size={30} />
          <h1>We couldn’t load home services</h1>
          <p>Try again in a moment.</p>
          <div className={styles.recovery}>
            <button type="button" className={styles.primary} onClick={reset}>Try again</button>
            <Link className={styles.outlineButton} href="/services">Back to home services</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
