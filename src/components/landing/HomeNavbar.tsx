"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import {
  subscribeSavedListings,
  readSavedListings,
  getSavedListingsServerSnapshot,
} from "@/lib/saved-listings/store";
import { HomeIcon } from "./HomeIcons";
import styles from "./HomePage.module.css";

const navLinks = [
  { label: "Rentals", href: "/properties" },
  { label: "Home services", href: "/services" },
  { label: "For landlords", href: "/landlords" },
  { label: "For providers", href: "/service-providers" },
];

function SavedLink() {
  const saved = useSyncExternalStore(subscribeSavedListings, readSavedListings, getSavedListingsServerSnapshot);
  const count = saved.length;
  const label = count === 0 ? "Saved homes" : count + " saved " + (count === 1 ? "home" : "homes");

  return (
    <Link href="/saved" className={styles.iconButton} aria-label={label} title={label}>
      <HomeIcon name="heart" size={22} />
      {count > 0 && <span className={styles.savedBadge} aria-hidden="true">{count > 99 ? "99+" : count}</span>}
    </Link>
  );
}

export function HomeNavbar() {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function dismiss(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    }
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [open]);

  return (
    <header className={styles.header}>
      <div className={styles.wrap}>
        <nav className={styles.nav} aria-label="Main navigation">
          <Link href="/" aria-label="MitaSafi home" className={styles.brand} onClick={() => setOpen(false)}>
            <Logo variant="full" color="teal" size="sm" />
          </Link>
          <div className={styles.desktopNav}>
            {navLinks.map(({ label, href }) => <Link key={href} href={href}>{label}</Link>)}
          </div>
          <div className={styles.navActions}>
            <div className={styles.notifications}><NotificationCenter triggerIcon={<HomeIcon name="bell" size={22} />} /></div>
            <SavedLink />
            <Link href="/login" className={styles.login}>Log in</Link>
            <Link href="/signup" className={styles.signUp}>Sign up</Link>
            <button
              ref={button}
              type="button"
              className={styles.menuButton}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-controls="mitasafi-home-menu"
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              <HomeIcon name={open ? "close" : "menu"} size={23} />
            </button>
          </div>
          <div className={styles.mobileMenu} hidden={!open} id="mitasafi-home-menu">
            {navLinks.map(({ label, href }) => <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>)}
            <div><Link href="/login" onClick={() => setOpen(false)}>Log in</Link><Link href="/signup" onClick={() => setOpen(false)}>Sign up</Link></div>
          </div>
        </nav>
      </div>
    </header>
  );
}
