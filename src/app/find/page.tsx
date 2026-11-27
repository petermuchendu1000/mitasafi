import type { Metadata } from "next";
import { LocalSearchDirectory } from "@/components/landing/LocalSearchDirectory";
import styles from "@/components/landing/HomePage.module.css";
import { siteUrl } from "@/lib/site/urls";

export const metadata: Metadata = {
  title: "Rental & Home Service Searches by Location | MitaSafi Kenya",
  description: "Find local searches for bedsitters, houses, apartments, movers, cleaners and repairs across Kenya. Compare results by town or county.",
  alternates: { canonical: siteUrl("/find") },
};

export default function FindDirectory() {
  return (
    <main id="main-content" className={styles.localPage}>
      <div className={styles.wrap}>
        <h1>Find rentals and home services by location</h1>
        <p>Pick a town or county and the kind of home or help you need. Each search opens with the location and filters already set.</p>
        <LocalSearchDirectory expanded />
      </div>
    </main>
  );
}
