"use client";

import { useState, useRef, useEffect } from "react";
import { useNotifications } from "@/hooks";
import { formatDistanceToNow } from "date-fns";
import { Bell, Check, Trash2, X } from "lucide-react";
import Link from "next/link";

export function NotificationCenter() {
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification 
  } = useNotifications();
  
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  const getNotificationLink = (notification: {
    type: string;
    action_url?: string | null;
    entity_type: string | null;
    entity_id: string | null;
  }): string | null => {
    // Primary: use action_url stored by notification triggers (booking events)
    if (notification.action_url) {
      return notification.action_url;
    }

    // Fallback: type-based resolution for legacy listing notification types
    switch (notification.type) {
      case "new_inquiry":
        return notification.entity_id && notification.entity_type === 'inquiry'
          ? `/dashboard/inquiries?highlight=${notification.entity_id}`
          : "/dashboard/inquiries";
      case "listing_status_change":
        return notification.entity_id && notification.entity_type === 'listing'
          ? `/listings/${notification.entity_id}`
          : "/saved";
      case "listing_available":
        return notification.entity_id && notification.entity_type === 'listing'
          ? `/listings/${notification.entity_id}`
          : "/properties";
      default:
        return null;
    }
  };
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-gray-700"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 text-[10px] font-medium text-white bg-orange-500 rounded-full flex items-center justify-center px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg border border-gray-200 z-50">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-900">Notifications</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="py-8 text-center text-sm text-gray-400">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">No notifications</div>
            ) : (
              <ul>
                {notifications.map((notification) => {
                  const link = getNotificationLink(notification);
                  const isUnread = !notification.read_at;
                  
                  const content = (
                    <div className={`px-4 py-3 hover:bg-gray-50 ${isUnread ? "bg-gray-50" : ""}`}>
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${isUnread ? "font-medium text-gray-900" : "text-gray-600"}`}>
                            {notification.title}
                          </p>
                          {notification.message && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {isUnread && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600"
                              title="Mark as read"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                  
                  return (
                    <li key={notification.id} className="border-b border-gray-100 last:border-0">
                      {link ? (
                        <Link 
                          href={link} 
                          onClick={() => {
                            if (isUnread) markAsRead(notification.id);
                            setIsOpen(false);
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
      )}
    </div>
  );
}
