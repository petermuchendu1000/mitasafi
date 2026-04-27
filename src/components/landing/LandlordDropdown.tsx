"use client";

import { useState, useRef, useEffect, useCallback, useId } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Building2, Megaphone, LayoutDashboard } from "lucide-react";

const MENU_ITEMS = [
  {
    href: "/signup?role=landlord&intent=list",
    icon: <Megaphone className="w-5 h-5 text-cta-500" />,
    iconBg: "bg-cta-50 group-hover/item:bg-cta-100",
    arrowHoverColor: "group-hover/item:text-cta-500",
    title: "List a Vacancy",
    description: "Advertise your empty unit to find tenants",
  },
  {
    href: "/signup?role=landlord&intent=manage",
    icon: <LayoutDashboard className="w-5 h-5 text-brand-500" />,
    iconBg: "bg-brand-50 group-hover/item:bg-brand-100",
    arrowHoverColor: "group-hover/item:text-brand-500",
    title: "Manage Properties",
    description: "Track rent, tenants & maintenance",
  },
] as const;

interface LandlordDropdownProps {
  /** Whether the menu opens above or below the trigger button. */
  direction?: "down" | "up";
  /** Full className string for the trigger <button> element. */
  triggerClassName?: string;
}

/**
 * Accessible landlord-action dropdown used in Hero and CTA sections.
 *
 * Implements the WAI-ARIA Disclosure pattern:
 * - Click to toggle (works on touch + mouse + keyboard)
 * - Escape to close (returns focus to trigger)
 * - Click-outside to close
 * - aria-expanded + aria-controls linkage
 */
export function LandlordDropdown({
  direction = "down",
  triggerClassName,
}: LandlordDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  // Close on click outside or Escape key
  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className={triggerClassName}
      >
        <Building2 className="w-5 h-5" />
        For Landlords
        <svg
          className={cn(
            "w-4 h-4 ml-1 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          id={panelId}
          className={cn(
            "absolute left-0 w-72 z-50 animate-fade-in",
            direction === "down" ? "top-full mt-2" : "bottom-full mb-2"
          )}
        >
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden p-2">
            {MENU_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-50 transition-colors group/item"
              >
                <div
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    item.iconBg
                  )}
                >
                  {item.icon}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{item.title}</p>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
                <svg
                  className={cn(
                    "w-4 h-4 text-gray-300 group-hover/item:translate-x-0.5 transition-all",
                    item.arrowHoverColor
                  )}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
