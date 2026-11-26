"use client";

/**
 * The row of filters that sits above every list in the landlord dashboard.
 *
 * WHY ONE COMPONENT
 *   Five lists had written their own: buildings, tenants, leases,
 *   maintenance and applications. They came in two visual styles, three
 *   different paddings, and every one of them measured between 30px and
 *   36px tall, which is under every thumb guideline there is. On a phone
 *   they wrapped onto two and three ragged rows.
 *
 *   Buildings' row had no aria-pressed on any button, so a screen reader
 *   was told there were three buttons and nothing about which filter was
 *   on. That is the kind of thing that survives in a copy of a copy and
 *   cannot survive in one component.
 *
 * WHY IT SCROLLS RATHER THAN WRAPS
 *   Wrapping is what produced "Outstanding / Overdue / Paid" on one line
 *   and a lonely "All" on the next. A single row that scrolls keeps the
 *   filters in one place the thumb can learn, and from sm: there is room
 *   for all of them anyway, so the scroll never appears on a desktop.
 */

import { cn } from "@/lib/utils";

export interface FilterOption<T extends string> {
  id: T;
  label: string;
  /** Shown beside the label. Pass undefined, not 0, to show nothing. */
  count?: number;
}

export function FilterPills<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: {
  /** Names the group for a screen reader, e.g. "Filter leases". */
  label: string;
  value: T;
  onChange: (next: T) => void;
  options: FilterOption<T>[];
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex gap-1 overflow-x-auto sm:flex-wrap sm:overflow-visible",
        className,
      )}
    >
      {options.map((option) => {
        const on = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            aria-pressed={on}
            className={cn(
              "shrink-0 whitespace-nowrap px-3 min-h-[44px] rounded-lg text-sm",
              "border transition-colors",
              on
                ? "bg-teal-600 text-white border-teal-600 font-medium"
                : "bg-white text-gray-700 border-gray-200 hover:border-gray-300",
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span
                className={cn(
                  "ml-1.5 text-xs",
                  on ? "text-teal-100" : "text-gray-400",
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
