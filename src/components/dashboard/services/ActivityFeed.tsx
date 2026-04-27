/**
 * ActivityFeed
 *
 * Displays the last 10 notification events as a vertical timeline.
 * Each item shows type, title, relative time, and links to the action URL.
 */

import Link from "next/link";
import {
  Bell,
  CheckCircle,
  Clock,
  DollarSign,
  MessageSquare,
  Star,
  AlertTriangle,
  FileText,
  Briefcase,
} from "lucide-react";
import type { ActivityEvent } from "@/lib/services/dashboard";

interface ActivityFeedProps {
  events: ActivityEvent[];
}

/** Map notification type to icon and color */
function getEventConfig(title: string): {
  icon: React.ElementType;
  color: string;
  bgColor: string;
} {
  const titleLower = title.toLowerCase();

  if (titleLower.includes("payment") || titleLower.includes("paid")) {
    return { icon: DollarSign, color: "text-emerald-600", bgColor: "bg-emerald-50" };
  }
  if (titleLower.includes("message") || titleLower.includes("chat")) {
    return { icon: MessageSquare, color: "text-blue-600", bgColor: "bg-blue-50" };
  }
  if (titleLower.includes("review") || titleLower.includes("rating")) {
    return { icon: Star, color: "text-amber-600", bgColor: "bg-amber-50" };
  }
  if (titleLower.includes("complete") || titleLower.includes("confirmed")) {
    return { icon: CheckCircle, color: "text-emerald-600", bgColor: "bg-emerald-50" };
  }
  if (titleLower.includes("cancel") || titleLower.includes("dispute")) {
    return { icon: AlertTriangle, color: "text-red-600", bgColor: "bg-red-50" };
  }
  if (titleLower.includes("quote")) {
    return { icon: FileText, color: "text-purple-600", bgColor: "bg-purple-50" };
  }
  if (titleLower.includes("schedul") || titleLower.includes("upcoming")) {
    return { icon: Clock, color: "text-brand-600", bgColor: "bg-brand-50" };
  }
  if (titleLower.includes("booking") || titleLower.includes("request")) {
    return { icon: Briefcase, color: "text-brand-600", bgColor: "bg-brand-50" };
  }

  return { icon: Bell, color: "text-gray-600", bgColor: "bg-gray-50" };
}

/** Format ISO date to relative time string */
function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString("en-KE", {
    month: "short",
    day: "numeric",
  });
}

export function ActivityFeed({ events }: ActivityFeedProps) {
  if (events.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="font-medium text-gray-900 mb-4">Recent Activity</h2>
        <p className="text-sm text-gray-500 text-center py-4">
          No recent activity
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-medium text-gray-900">Recent Activity</h2>
        <Link
          href="/dashboard/notifications"
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          View all
        </Link>
      </div>

      <div className="divide-y divide-gray-100">
        {events.map((event) => {
          const config = getEventConfig(event.title);
          const EventIcon = config.icon;
          const href = event.action_url || (event.booking_id ? `/dashboard/bookings/${event.booking_id}` : null);

          const content = (
            <div className="flex items-start gap-3 px-5 py-3">
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${config.bgColor}`}
              >
                <EventIcon className={`w-4 h-4 ${config.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 leading-snug">
                  {event.title}
                </p>
                {event.description && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                    {event.description}
                  </p>
                )}
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">
                {timeAgo(event.created_at ?? "")}
              </span>
            </div>
          );

          if (href) {
            return (
              <Link
                key={event.id}
                href={href}
                className="block hover:bg-gray-50 transition-colors"
              >
                {content}
              </Link>
            );
          }

          return (
            <div key={event.id}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
