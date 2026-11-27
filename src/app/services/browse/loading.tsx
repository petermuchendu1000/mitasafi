import { HomeNavbar } from "@/components/landing/HomeNavbar";
import { homeFont } from "@/components/landing/home-font";
import homeStyles from "@/components/landing/HomePage.module.css";
import styles from "./browse.module.css";

export default function BrowseLoading() {
  return (
    <div className={`${homeFont.variable} ${homeStyles.home} ${styles.page}`}>
      <HomeNavbar activePage="services" />
      <main aria-busy="true">
        <div className={styles.intro}>
          <div className={styles.wrap}>
            <div className={styles.breadcrumb}><span>Home services / Browse</span></div>
            <h1>Find home services in Kenya</h1>
            <p role="status">Loading providers…</p>
          </div>
        </div>
        <div className={styles.wrap} aria-hidden="true">
          <div className={styles.loadingHeading} />
          <div className={styles.cards}>
            {[0, 1, 2].map((index) => <div key={index} className={styles.loadingCard} />)}
          </div>
        </div>
      </main>
    </div>
  );
}
