"use client";

import Link from "next/link";
import { HomeNavbar } from "@/components/landing/HomeNavbar";
import { homeFont } from "@/components/landing/home-font";
import homeStyles from "@/components/landing/HomePage.module.css";
import styles from "./provider-profile.module.css";

export default function ProviderProfileError({ reset }: { reset: () => void }) {
  return (
    <div className={`${homeFont.variable} ${homeStyles.home} ${styles.page}`}>
      <HomeNavbar activePage="services" />
      <main className={`${styles.wrap} ${styles.recovery}`}>
        <h1>We couldn’t load this profile</h1>
        <div className={styles.recoveryActions}>
          <button type="button" className={styles.primary} onClick={reset}>Try again</button>
          <Link className={styles.secondary} href="/services/browse">Browse services</Link>
        </div>
      </main>
    </div>
  );
}
