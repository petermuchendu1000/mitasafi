// =============================================================================
// MITASAFI: QUICK FILTER TOGGLES
// =============================================================================
// Client-side toggle buttons for quick filters like Fiverr's
// "Pro services", "Instant response" buttons.
// =============================================================================

"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface QuickFilterToggleProps {
  label: string;
  paramKey: string;
  icon?: ReactNode;
  className?: string;
}

export function QuickFilterToggle({
  label,
  paramKey,
  icon,
  className,
}: QuickFilterToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isActive = searchParams.get(paramKey) === "true";

  const handleToggle = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (isActive) {
      params.delete(paramKey);
    } else {
      params.set(paramKey, "true");
    }
    params.delete("page"); // Reset pagination
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <button
      onClick={handleToggle}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200",
        isActive
          ? "bg-gray-900 text-white shadow-sm"
          : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400",
        className
      )}
      aria-pressed={isActive}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
