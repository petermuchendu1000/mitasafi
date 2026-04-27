/**
 * Notifications Page Client Component
 * 
 * Client-side interactivity for the notifications page.
 */

"use client";

import { useState } from "react";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { 
  Bell, 
  Calendar,
  Check, 
  CheckCheck,
  CreditCard,
  DollarSign,
  FileText,
  Trash2, 
  MessageSquare, 
  Home,
  AlertCircle,
  Loader2,
  Shield,
  Star,
  ThumbsDown,
  UserCheck,
  XCircle,
} from "lucide-react";
import Link from "next/link";

interface NotificationsPageClientProps {
  initialNotifications: Notification[];
}

// =============================================================================
// ICON & LINK RESOLUTION
// =============================================================================
// Every booking trigger in src/lib/notifications/triggers.ts sets `action_url`
// on the notification row. We use that as the canonical link. The icon helper
// maps notification types to visually distinct icons so users can scan quickly.
// =============================================================================

/** Return a coloured icon element for each notification type. */
function getNotificationIcon(type: string) {
  switch (type) {
    // ── Legacy property types ─────────────────────────────────────────
    case "new_inquiry":
      return <MessageSquare className="h-5 w-5 text-blue-500" />;
    case "listing_status_change":
      return <Home className="h-5 w-5 text-emerald-500" />;

    // ── Booking lifecycle ─────────────────────────────────────────────
    case "booking_new":
      return <Bell className="h-5 w-5 text-blue-600" />;
    case "booking_accepted":
      return <UserCheck className="h-5 w-5 text-emerald-600" />;
    case "booking_cancelled":
    case "booking_cancelled_by_customer":
      return <XCircle className="h-5 w-5 text-red-500" />;

    // ── Quote lifecycle ───────────────────────────────────────────────
    case "quote_sent":
      return <FileText className="h-5 w-5 text-indigo-500" />;
    case "quote_accepted":
      return <Check className="h-5 w-5 text-emerald-600" />;
    case "quote_rejected":
      return <ThumbsDown className="h-5 w-5 text-amber-500" />;

    // ── Messaging ─────────────────────────────────────────────────────
    case "new_message":
      return <MessageSquare className="h-5 w-5 text-blue-500" />;

    // ── Job lifecycle ─────────────────────────────────────────────────
    case "job_scheduled":
      return <Calendar className="h-5 w-5 text-indigo-600" />;
    case "job_started":
      return <Loader2 className="h-5 w-5 text-amber-600" />;
    case "job_completed":
    case "completion_confirmed":
      return <CheckCheck className="h-5 w-5 text-emerald-600" />;

    // ── Payments ──────────────────────────────────────────────────────
    case "payment_received":
    case "payment_confirmed":
      return <CreditCard className="h-5 w-5 text-emerald-600" />;
    case "payment_failed":
      return <CreditCard className="h-5 w-5 text-red-500" />;
    case "payout_completed":
      return <DollarSign className="h-5 w-5 text-emerald-600" />;

    // ── Reviews ───────────────────────────────────────────────────────
    case "review_new":
    case "review_response":
    case "review_prompt":
      return <Star className="h-5 w-5 text-amber-500" />;

    // ── Disputes & Refunds ────────────────────────────────────────────
    case "dispute_filed":
    case "dispute_updated":
      return <Shield className="h-5 w-5 text-red-500" />;
    case "refund_processed":
      return <DollarSign className="h-5 w-5 text-blue-600" />;

    // ── System / fallback ─────────────────────────────────────────────
    case "system_announcement":
    case "account_update":
    default:
      return <AlertCircle className="h-5 w-5 text-gray-500" />;
  }
}

/**
 * Resolve the link for a notification.
 *
 * Booking notifications always set `action_url` on the DB row, so that is
 * the canonical source. Legacy property types fall back to entity-based
 * routing for backward compatibility.
 */
function getNotificationLink(notification: Notification): string | null {
  // ── Canonical: use the action_url set by triggers.ts ───────────────
  if (notification.action_url) {
    return notification.action_url;
  }

  // ── Legacy property-module fallbacks ───────────────────────────────
  switch (notification.type) {
    case "new_inquiry":
      return notification.entity_id && notification.entity_type === "inquiry"
        ? `/dashboard/inquiries?highlight=${notification.entity_id}`
        : "/dashboard/inquiries";
    case "listing_status_change":
      return notification.entity_id && notification.entity_type === "listing"
        ? `/listings/${notification.entity_id}`
        : "/saved";
    default:
      return null;
  }
}

export function NotificationsPageClient({ initialNotifications }: NotificationsPageClientProps) {
  const { 
    notifications: realtimeNotifications, 
    unreadCount, 
    isLoading, 
    isConnected,
    markAsRead, 
    markAllAsRead, 
    deleteNotification 
  } = useNotifications();
  
  // Use realtime notifications if available, otherwise initial
  const notifications = realtimeNotifications.length > 0 ? realtimeNotifications : initialNotifications;
  
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  
  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read_at;
    if (filter === 'read') return !!n.read_at;
    return true;
  });
  
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Connection indicator */}
          <span 
            className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${
              isConnected 
                ? "bg-green-100 text-green-700" 
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-yellow-500"}`} />
            {isConnected ? "Live" : "Connecting..."}
          </span>
          
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all as read
            </button>
          )}
        </div>
      </div>
      
      {/* Filter tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-6 w-fit">
        {(['all', 'unread', 'read'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filter === f
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      
      {/* Notifications list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {isLoading && notifications.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Bell className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">
              {filter === 'unread' ? 'No unread notifications' : 
               filter === 'read' ? 'No read notifications' : 
               'No notifications yet'}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              {filter === 'all' && "You'll see updates about bookings, messages, payments, and more here"}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filteredNotifications.map((notification) => {
              const link = getNotificationLink(notification);
              const isUnread = !notification.read_at;
              
              const content = (
                <div
                  className={`flex gap-4 px-6 py-4 hover:bg-gray-50 transition-colors ${
                    isUnread ? "bg-emerald-50/30" : ""
                  }`}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    <div className={`p-2 rounded-full ${isUnread ? "bg-white shadow-sm" : "bg-gray-100"}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${isUnread ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                      {notification.title}
                    </p>
                    {notification.message && (
                      <p className="text-sm text-gray-500 mt-1">
                        {notification.message}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex-shrink-0 flex items-start gap-2">
                    {isUnread && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-emerald-600 transition-colors"
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
              
              return (
                <li key={notification.id}>
                  {link ? (
                    <Link 
                      href={link} 
                      onClick={() => {
                        if (isUnread) markAsRead(notification.id);
                      }}
                    >
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
