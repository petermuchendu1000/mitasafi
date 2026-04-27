/**
 * Notification Bell Component
 * 
 * Displays notification bell with unread count and dropdown.
 * Shows saved listing status changes.
 */

"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getNotificationMessage,
  getRelativeTime,
  type Notification,
} from "@/lib/notifications";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load notifications
  useEffect(() => {
    const loadNotifications = () => {
      setNotifications(getNotifications());
      setUnreadCount(getUnreadCount());
    };

    loadNotifications();

    // Listen for changes
    window.addEventListener("notificationsChanged", loadNotifications);
    window.addEventListener("storage", (e) => {
      if (e.key === "mitasafi_notifications") loadNotifications();
    });

    return () => {
      window.removeEventListener("notificationsChanged", loadNotifications);
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  const handleMarkAllRead = () => {
    markAllAsRead();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <Link
                    key={notification.id}
                    href={notification.type === "deleted" ? "/saved" : `/properties/${notification.listingId}`}
                    onClick={() => {
                      handleNotificationClick(notification);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "block px-4 py-3 hover:bg-gray-50 transition-colors",
                      !notification.read && "bg-blue-50/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {!notification.read && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                      )}
                      <div className={cn("flex-1 min-w-0", notification.read && "ml-5")}>
                        <p className="text-sm text-gray-900 leading-snug">
                          <span className="font-medium">{notification.listingTitle}</span>
                          {" "}
                          <span className="text-gray-600">{getNotificationMessage(notification)}</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {getRelativeTime(notification.timestamp)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
              <Link
                href="/saved"
                onClick={() => setIsOpen(false)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                View saved properties →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
