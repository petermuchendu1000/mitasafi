import Link from "next/link";
import { HomeNavbar } from "@/components/landing/HomeNavbar";
import { homeFont } from "@/components/landing/home-font";
import homeStyles from "@/components/landing/HomePage.module.css";
import styles from "./service-detail.module.css";

export default function ServiceNotFound() {
  return (
    <div className={`${homeFont.variable} ${homeStyles.home} ${styles.page}`}>
      <HomeNavbar activePage="services" />
      <main className={`${styles.wrap} ${styles.unavailable}`}>
        <div className={styles.intro}><h1>Service unavailable</h1></div>
        <Link href="/services/browse" className={styles.utility}>Browse services</Link>
      </main>
    </div>
  );
}
