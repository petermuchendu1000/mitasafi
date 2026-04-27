/**
 * ServicesNavbar — Services Landing Page Navigation
 *
 * Sticky navigation bar that starts transparent (blending with the hero)
 * and transitions to solid white after 100px of scroll.
 *
 * Client component: requires scroll listener + mobile menu toggle.
 *
 * @see SERVICES_LANDING_PAGE_SPECIFICATION.md §3 Section 0
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";

// =============================================================================
// NAVIGATION DATA
// =============================================================================

const NAV_LINKS = [
  { label: "Browse Services", href: "/services/browse" },
  {
    label: "Emergency",
    href: "/services/browse?available=true&sort=response_time",
  },
  { label: "For Providers", href: "/service-providers" },
  { label: "Pricing", href: "#pricing" },
] as const;

const AUTH_LINKS = {
  login: { label: "Log In", href: "/login" },
  signup: { label: "Get Started", href: "/signup" },
} as const;

/** Scroll threshold (px) for transparent → solid transition */
const SCROLL_THRESHOLD = 100;

// =============================================================================
// COMPONENT
// =============================================================================

export function ServicesNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // ── Scroll listener ──────────────────────────────────────────────────────
  const handleScroll = useCallback(() => {
    setIsScrolled(window.scrollY > SCROLL_THRESHOLD);
  }, []);

  useEffect(() => {
    // Check initial scroll position (e.g., after page refresh mid-scroll)
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // ── Lock body scroll when mobile menu is open ────────────────────────────
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  // Close mobile menu on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMobileMenuOpen]);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-soft"
          : "bg-transparent"
      )}
      role="banner"
    >
      <nav
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        aria-label="Services navigation"
      >
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* ── Logo ──────────────────────────────────────────────── */}
          <Link
            href="/"
            className="flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-lg"
            aria-label="MitaSafi — Home"
          >
            <Logo
              variant="full"
              color={isScrolled ? "teal" : "white"}
              size="sm"
            />
          </Link>

          {/* ── Desktop Navigation ────────────────────────────────── */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                  isScrolled
                    ? "text-gray-700 hover:text-brand-600 hover:bg-gray-100"
                    : "text-white/90 hover:text-white hover:bg-white/10"
                )}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* ── Desktop Auth ──────────────────────────────────────── */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              href={AUTH_LINKS.login.href}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                isScrolled
                  ? "text-gray-700 hover:text-brand-600 hover:bg-gray-100"
                  : "text-white/90 hover:text-white hover:bg-white/10"
              )}
            >
              {AUTH_LINKS.login.label}
            </Link>
            <Link
              href={AUTH_LINKS.signup.href}
              className={cn(
                "inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                isScrolled
                  ? "bg-cta-600 text-white hover:bg-cta-700 focus-visible:ring-cta-500"
                  : "bg-white text-cta-700 hover:bg-white/90 focus-visible:ring-white"
              )}
            >
              {AUTH_LINKS.signup.label}
            </Link>
          </div>

          {/* ── Mobile Hamburger ──────────────────────────────────── */}
          <button
            type="button"
            className={cn(
              "lg:hidden flex flex-col items-center justify-center w-11 h-11 rounded-lg transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
              isScrolled
                ? "text-gray-700 hover:bg-gray-100"
                : "text-white hover:bg-white/10"
            )}
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
          >
            <span
              className={cn(
                "block w-5 h-0.5 rounded-full transition-colors",
                isScrolled ? "bg-gray-700" : "bg-white"
              )}
            />
            <span
              className={cn(
                "block w-5 h-0.5 rounded-full mt-1.5 transition-colors",
                isScrolled ? "bg-gray-700" : "bg-white"
              )}
            />
            <span
              className={cn(
                "block w-5 h-0.5 rounded-full mt-1.5 transition-colors",
                isScrolled ? "bg-gray-700" : "bg-white"
              )}
            />
          </button>
        </div>
      </nav>

      {/* ── Mobile Menu Overlay ────────────────────────────────────── */}
      {isMobileMenuOpen && (
        <div
          id="mobile-menu"
          className="fixed inset-0 z-50 bg-white"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          {/* Header row */}
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 border-b border-gray-100">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-lg"
              aria-label="MitaSafi — Home"
            >
              <Logo variant="full" color="teal" size="sm" />
            </Link>
            <button
              type="button"
              className="flex items-center justify-center w-11 h-11 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close navigation menu"
            >
              {/* × close character — no Lucide icon */}
              <span className="text-2xl font-light leading-none" aria-hidden="true">
                ×
              </span>
            </button>
          </div>

          {/* Nav links */}
          <nav className="px-4 sm:px-6 py-6" aria-label="Mobile navigation">
            <ul className="space-y-1">
              {NAV_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-4 py-3 text-base font-medium text-gray-900 rounded-lg hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Auth actions */}
            <div className="mt-8 pt-6 border-t border-gray-100 space-y-3">
              <Link
                href={AUTH_LINKS.login.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block w-full text-center px-4 py-3 text-base font-medium text-gray-700 rounded-lg border-2 border-gray-200 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                {AUTH_LINKS.login.label}
              </Link>
              <Link
                href={AUTH_LINKS.signup.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block w-full text-center px-4 py-3 text-base font-semibold rounded-lg bg-cta-600 text-white hover:bg-cta-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-cta-500"
              >
                {AUTH_LINKS.signup.label}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
