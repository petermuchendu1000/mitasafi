/**
 * QuickActions
 *
 * A row of quick-action buttons for the customer dashboard home.
 * Browse Services, My Bookings, Messages (with unread count), Saved Providers.
 */

import Link from "next/link";
import {
  Search,
  Briefcase,
  MessageSquare,
  Heart,
} from "lucide-react";

interface QuickActionsProps {
  unreadMessageCount: number;
  savedProvidersCount: number;
  activeBookingsCount: number;
}

const actions = [
  {
    label: "Browse Services",
    href: "/services/browse",
    icon: Search,
    color: "bg-brand-50 text-brand-600 group-hover:bg-brand-100",
    countKey: null,
  },
  {
    label: "My Bookings",
    href: "/dashboard/bookings",
    icon: Briefcase,
    color: "bg-amber-50 text-amber-600 group-hover:bg-amber-100",
    countKey: "activeBookingsCount" as const,
  },
  {
    label: "Messages",
    href: "/dashboard/bookings/messages",
    icon: MessageSquare,
    color: "bg-blue-50 text-blue-600 group-hover:bg-blue-100",
    countKey: "unreadMessageCount" as const,
  },
  {
    label: "Saved Providers",
    href: "/dashboard/saved-providers",
    icon: Heart,
    color: "bg-rose-50 text-rose-600 group-hover:bg-rose-100",
    countKey: "savedProvidersCount" as const,
  },
] as const;

export function QuickActions({
  unreadMessageCount,
  savedProvidersCount,
  activeBookingsCount,
}: QuickActionsProps) {
  const counts: Record<string, number> = {
    unreadMessageCount,
    savedProvidersCount,
    activeBookingsCount,
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {actions.map((action) => {
        const ActionIcon = action.icon;
        const count = action.countKey ? counts[action.countKey] ?? 0 : 0;

        return (
          <Link
            key={action.href}
            href={action.href}
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all group"
          >
            <div className={`p-2.5 rounded-lg transition-colors ${action.color}`}>
              <ActionIcon className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-gray-700 text-center">
              {action.label}
            </span>
            {count > 0 && (
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
