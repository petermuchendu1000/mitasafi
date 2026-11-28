import Link from "next/link";
import { HomeNavbar } from "@/components/landing/HomeNavbar";
import { homeFont } from "@/components/landing/home-font";
import homeStyles from "@/components/landing/HomePage.module.css";
import styles from "./provider-profile.module.css";

export default function ProviderNotFound() {
  return (
    <div className={`${homeFont.variable} ${homeStyles.home} ${styles.page}`}>
      <HomeNavbar activePage="services" />
      <main className={`${styles.wrap} ${styles.recovery}`}>
        <h1>Provider profile unavailable</h1>
        <p className={styles.note}>You can find other providers in your area.</p>
        <Link className={styles.primary} href="/services/browse">Browse services</Link>
      </main>
    </div>
  );
}
