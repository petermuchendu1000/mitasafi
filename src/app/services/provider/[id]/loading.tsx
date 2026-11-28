import { HomeNavbar } from "@/components/landing/HomeNavbar";
import { homeFont } from "@/components/landing/home-font";
import homeStyles from "@/components/landing/HomePage.module.css";
import styles from "./provider-profile.module.css";

export default function ProviderProfileLoading() {
  return (
    <div className={`${homeFont.variable} ${homeStyles.home} ${styles.page}`}>
      <HomeNavbar activePage="services" />
      <main aria-busy="true">
        <div className={styles.intro}>
          <div className={`${styles.wrap} ${styles.loadingIntro}`}>
            <p className={styles.note} role="status">Loading provider profile…</p>
            <div className={styles.skeletonTitle} aria-hidden="true" />
          </div>
        </div>
        <div className={`${styles.wrap} ${styles.layout}`} aria-hidden="true">
          <div className={`${styles.services} ${styles.skeletonCards}`}><div /><div /></div>
          <div className={`${styles.sidebar} ${styles.skeletonPanel}`} />
        </div>
      </main>
    </div>
  );
}
