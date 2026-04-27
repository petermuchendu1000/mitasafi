/**
 * Verification Queue Filters — Client component
 *
 * Simple tab-style filter for pending / rejected / all.
 * Uses URL search params so the server component can read the filter.
 */

"use client";

import { useRouter, usePathname } from "next/navigation";

const filters = [
  { value: "pending", label: "Pending" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
] as const;

interface VerificationQueueFiltersProps {
  current: string;
}

export function VerificationQueueFilters({
  current,
}: VerificationQueueFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();

  function handleFilter(value: string) {
    const params = new URLSearchParams();
    params.set("filter", value);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
      {filters.map((f) => (
        <button
          key={f.value}
          onClick={() => handleFilter(f.value)}
          className={`
            px-4 py-1.5 rounded-md text-sm font-medium transition-colors
            ${current === f.value
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
            }
          `}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
