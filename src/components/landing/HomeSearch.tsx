"use client";

import { useState } from "react";
import type { PropertyType } from "@/lib/listings/types";
import { HomeIcon } from "./HomeIcons";
import styles from "./HomePage.module.css";

interface HomeSearchProps {
  areas: { label: string; value: string }[];
  types: { label: string; value: PropertyType }[];
}

export function HomeSearch({ areas, types }: HomeSearchProps) {
  const [mode, setMode] = useState<"rentals" | "services">("rentals");
  const [area, setArea] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [serviceQuery, setServiceQuery] = useState("");
  const isRental = mode === "rentals";

  return (
    <div className={styles.searchPanel} id="marketplace-search">
      <div className={styles.searchModes} role="group" aria-label="Search marketplace">
        <button type="button" aria-pressed={isRental} onClick={() => setMode("rentals")}>
          <HomeIcon name="home" size={19} /> Rentals
        </button>
        <button type="button" aria-pressed={!isRental} onClick={() => setMode("services")}>
          <HomeIcon name="tools" size={19} /> Home services
        </button>
      </div>
      <form
        action={isRental ? "/properties" : "/services/browse"}
        method="get"
        className={styles.marketplaceForm}
        aria-label={isRental ? "Search rentals" : "Search home services"}
      >
        {isRental && <input type="hidden" name="residential" value="1" />}
        <div className={styles.searchField}>
          <label htmlFor="marketplace-area">City, town or county</label>
          <select id="marketplace-area" name="location" value={area} onChange={(event) => setArea(event.target.value)}>
            <option value="">Anywhere in Kenya</option>
            {areas.map(({ label, value }) => <option key={value} value={value}>{label}</option>)}
          </select>
          <HomeIcon name="chevron" size={18} className={styles.selectCaret} />
        </div>
        {isRental ? (
          <div className={styles.searchField}>
            <label htmlFor="marketplace-type">Home type</label>
            <select id="marketplace-type" name="type" value={propertyType} onChange={(event) => setPropertyType(event.target.value)}>
              <option value="">Any type</option>
              {types.map(({ label, value }) => <option key={value} value={value}>{label}</option>)}
            </select>
            <HomeIcon name="chevron" size={18} className={styles.selectCaret} />
          </div>
        ) : (
          <div className={styles.searchField}>
            <label htmlFor="marketplace-service">Service</label>
            <input id="marketplace-service" type="search" name="q" placeholder="e.g. plumber" value={serviceQuery} onChange={(event) => setServiceQuery(event.target.value)} />
          </div>
        )}
        <button className={styles.searchButton} type="submit">
          <HomeIcon name="search" size={19} />
          {isRental ? "Search rentals" : "Search services"}
        </button>
      </form>
    </div>
  );
}
