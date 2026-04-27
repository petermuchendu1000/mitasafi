"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Logo, Container } from "@/components/ui";
import { buttonVariants } from "@/components/ui/Button";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { Menu, X, Heart } from "lucide-react";

// Local storage key for saved listings (same as PropertyCard)
const STORAGE_KEY = "mitasafi_saved_listings";

const navLinks = [
  { label: "Browse Homes", href: "/properties" },
  { label: "Services", href: "/services" },
  { label: "For Landlords", href: "/landlords" },
  { label: "For Providers", href: "/service-providers" },
  { label: "How It Works", href: "/#how-it-works" },
];

// Saved count badge component
function SavedCountBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Initial count
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      setCount(saved.length);
    } catch {
      // Ignore
    }

    // Listen for changes from other components
    const handleChange = () => {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        setCount(saved.length);
      } catch {
        // Ignore
      }
    };

    window.addEventListener("savedListingsChanged", handleChange);
    // Also listen for storage events from other tabs
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY) handleChange();
    });

    return () => {
      window.removeEventListener("savedListingsChanged", handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, []);

  return (
    <Link
      href="/saved"
      className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
      title={count > 0 ? `${count} saved ${count === 1 ? "property" : "properties"}` : "Saved properties"}
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
        "bg-white/95 backdrop-blur-md shadow-soft"
      )}
    >
      <Container>
        <nav className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Logo
              variant="full"
              color="teal"
              size="sm"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="font-medium transition-colors duration-200 text-gray-600 hover:text-brand-600 focus:outline-none focus-visible:outline-none"
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
              className="font-medium transition-colors duration-200 text-gray-600 hover:text-brand-600 px-3 py-2"
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
              className="p-2 rounded-lg transition-colors text-gray-600 hover:bg-gray-100"
              aria-label="Toggle menu"
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
            "lg:hidden overflow-hidden transition-all duration-300",
            isMobileMenuOpen ? "max-h-96 pb-6" : "max-h-0"
          )}
        >
          <div className="flex flex-col gap-4 pt-4 border-t border-gray-200">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="font-medium py-2 text-gray-600 hover:text-brand-600 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="flex flex-col gap-3 pt-4 border-t border-gray-200">
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="font-medium py-2 text-center text-gray-600 hover:text-brand-600"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                onClick={() => setIsMobileMenuOpen(false)}
                className={buttonVariants({ variant: "primary", fullWidth: true })}
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
