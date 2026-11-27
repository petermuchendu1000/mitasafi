"use client";

import { useEffect, useState } from "react";
import styles from "./HomePage.module.css";

export function HomeReveals() {
  useEffect(() => {
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.12) continue;
        entry.target.setAttribute("data-home-visible", "");
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.12 });

    document.querySelectorAll("[data-home-reveal]").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return null;
}

export function PhotoMotionControl() {
  const [paused, setPaused] = useState(false);

  return (
    <button
      type="button"
      className={styles.photoMotion}
      data-paused={paused}
      aria-label={paused ? "Resume photo motion" : "Pause photo motion"}
      title={paused ? "Resume photo motion" : "Pause photo motion"}
      onClick={() => setPaused((value) => !value)}
    >
      {paused ? "Resume motion" : "Pause motion"}
    </button>
  );
}
