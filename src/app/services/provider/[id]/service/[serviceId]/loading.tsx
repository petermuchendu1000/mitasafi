import { HomeNavbar } from "@/components/landing/HomeNavbar";
import { homeFont } from "@/components/landing/home-font";
import homeStyles from "@/components/landing/HomePage.module.css";
import styles from "./service-detail.module.css";

export default function ServiceDetailLoading() {
  return (
    <div className={`${homeFont.variable} ${homeStyles.home} ${styles.page}`}>
      <HomeNavbar activePage="services" />
      <main className={styles.wrap} aria-busy="true">
        <div className={styles.returnRow}>
          <p className={styles.utility} role="status">Loading service…</p>
        </div>
        <div className={styles.skeletonPhoto} aria-hidden="true" />
        <div className={styles.layout} aria-hidden="true">
          <div className={styles.content}>
            <div className={styles.intro}><div className={styles.skeletonTitle} /></div>
            <div className={styles.section}><div className={styles.skeletonReview} /><div className={styles.skeletonReview} /></div>
          </div>
          <div className={styles.booking}><div className={styles.skeletonPrice} /></div>
        </div>
      </main>
    </div>
  );
}
