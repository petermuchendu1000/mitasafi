"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Logo, Container } from "@/components/ui";
import { buttonVariants } from "@/components/ui/Button";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { Menu, X, Heart } from "lucide-react";
import {
  subscribeSavedListings,
  readSavedListings,
  getSavedListingsServerSnapshot,
} from "@/lib/saved-listings/store";

const navLinks = [
  { label: "Browse Homes", href: "/properties" },
  { label: "Services", href: "/services" },
  { label: "For Landlords", href: "/landlords" },
  { label: "For Providers", href: "/service-providers" },
  { label: "How It Works", href: "/#how-it-works" },
];

/**
 * The saved-listings count.
 *
 * This was a mount effect that seeded state and then subscribed, which ESLint reported
 * as react-hooks/set-state-in-effect. Reading it in full showed a defect the rule does
 * not report: the "storage" listener was registered as an anonymous function while the
 * cleanup removed `handleChange`. removeEventListener only detaches the SAME reference,
 * so that listener survived unmount — and because Navbar renders the badge twice, every
 * mount stranded two of them, each holding a closure over that mount's setCount.
 * Measured before the change: two live listeners after one mount/unmount, eight after
 * three.
 *
 * localStorage plus a change event is an external store, so useSyncExternalStore is the
 * API for it. Both the subscription and the snapshot now come from
 * @/lib/saved-listings/store, which is the single owner of this key — this file used to
 * be one of five places that declared and parsed it independently.
 */
function SavedCountBadge() {
  const saved = useSyncExternalStore(
    subscribeSavedListings,
    readSavedListings,
    getSavedListingsServerSnapshot,
  );
  const count = saved.length;

  return (
    <Link
      href="/saved"
      className="relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
      // A title is not an accessible name you can rely on: a touch device
      // never shows it, and this link has no text of its own, so the whole
      // control announced as "link" and nothing else.
      aria-label={count > 0 ? `Saved properties, ${count}` : "Saved properties"}
      title={
        count > 0
          ? `${count} saved ${count === 1 ? "property" : "properties"}`
          : "Saved properties"
      }
    >
      <Heart className="w-5 h-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-orange-500 rounded-full px-1">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        "bg-white/95 backdrop-blur-md shadow-soft",
      )}
    >
      <Container>
        <nav className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link
            href="/"
            aria-label="MitaSafi home"
            className="flex items-center gap-2 min-h-[44px] -ml-1 pl-1 pr-1"
          >
            <Logo variant="full" color="teal" size="sm" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="inline-flex items-center min-h-[44px] font-medium transition-colors duration-200 text-gray-600 hover:text-brand-600 focus:outline-none focus-visible:outline-none"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA Buttons */}
          <div className="hidden lg:flex items-center gap-2">
            <NotificationCenter />
            <SavedCountBadge />
            <Link
              href="/login"
              className="inline-flex items-center min-h-[44px] font-medium transition-colors duration-200 text-gray-600 hover:text-brand-600 px-3"
            >
              Log In
            </Link>
            <Link
              href="/signup"
              className={buttonVariants({ variant: "cta", size: "sm" })}
            >
              Create Account
            </Link>
          </div>

          {/* Mobile: Notifications + Saved + Menu Button */}
          <div className="lg:hidden flex items-center gap-1">
            <NotificationCenter />
            <SavedCountBadge />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors text-gray-600 hover:bg-gray-100"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </nav>

        {/* Mobile Menu */}
        <div
          className={cn(
            // max-h-96 is 384px. Five links and two buttons at 44px each,
            // with the gaps and the two dividers, come to about 416px, so
            // raising every row to a thumb-sized target would have pushed
            // "Create Account" behind the clip. Measured, not guessed.
            "lg:hidden overflow-hidden transition-all duration-300",
            isMobileMenuOpen ? "max-h-[36rem] pb-6" : "max-h-0",
          )}
        >
          <div className="flex flex-col gap-4 pt-4 border-t border-gray-200">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center min-h-[44px] font-medium text-gray-600 hover:text-brand-600 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="flex flex-col gap-3 pt-4 border-t border-gray-200">
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center min-h-[44px] font-medium text-gray-600 hover:text-brand-600"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                onClick={() => setIsMobileMenuOpen(false)}
                className={buttonVariants({
                  variant: "primary",
                  fullWidth: true,
                })}
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </header>
  );
}
