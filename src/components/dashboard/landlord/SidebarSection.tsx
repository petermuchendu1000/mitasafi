/**
 * SidebarSection Component
 * 
 * Groups related navigation items under a labeled section header.
 * Supports collapsed mode where labels are hidden.
 */

"use client";

import { cn } from "@/lib/utils";
import { SidebarNavItem } from "./SidebarNavItem";
import type { NavSection } from "./types";

interface SidebarSectionProps {
  section: NavSection;
  /** Whether sidebar is in collapsed (icon-only) mode */
  isCollapsed?: boolean;
}

export function SidebarSection({ section, isCollapsed = false }: SidebarSectionProps) {
  return (
    <div className="py-2" role="group" aria-labelledby={`section-${section.id}`}>
      {/* Section label - hidden when collapsed, shown as tooltip */}
      {!isCollapsed ? (
        <h3 
          id={`section-${section.id}`}
          className={cn(
            "px-3 py-2 text-[11px] font-semibold uppercase tracking-widest",
            "text-white/50 select-none"
          )}
        >
          {section.label}
        </h3>
      ) : (
        // Visual separator for collapsed mode
        <div className="mx-3 my-2 border-t border-white/10" aria-hidden="true" />
      )}
      
      {/* Navigation items */}
      <nav className="space-y-1" aria-label={section.label}>
        {section.items.map((item) => (
          <SidebarNavItem 
            key={item.id} 
            item={item} 
            isCollapsed={isCollapsed}
          />
        ))}
      </nav>
    </div>
  );
}
