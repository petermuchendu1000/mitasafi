import { HomeNavbar } from "@/components/landing/HomeNavbar";
import { homeFont } from "@/components/landing/home-font";
import styles from "@/components/landing/HomePage.module.css";

export default function FindLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${homeFont.variable} ${styles.home}`}>
      <a className={styles.skipLink} href="#main-content">Skip to content</a>
      <HomeNavbar />
      {children}
    </div>
  );
}
