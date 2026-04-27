/**
 * Notifications System
 * 
 * Handles notifications for saved listing status changes.
 * Stores in localStorage and provides utilities for managing notifications.
 */

export const NOTIFICATIONS_KEY = "mitasafi_notifications";

export interface Notification {
  id: string;
  listingId: string;
  listingTitle: string;
  type: "rented" | "paused" | "deleted" | "resumed";
  timestamp: number;
  read: boolean;
}

/**
 * Get all notifications from localStorage
 */
export function getNotifications(): Notification[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!stored) return [];
    const notifications = JSON.parse(stored) as Notification[];
    // Only keep notifications from the last 7 days
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return notifications.filter(n => n.timestamp > weekAgo);
  } catch {
    return [];
  }
}

/**
 * Add a new notification
 */
export function addNotification(notification: Omit<Notification, "id" | "read">): void {
  if (typeof window === "undefined") return;
  const notifications = getNotifications();
  const newNotification: Notification = {
    ...notification,
    id: `${notification.listingId}-${Date.now()}`,
    read: false,
  };
  notifications.unshift(newNotification);
  // Keep max 50 notifications
  const trimmed = notifications.slice(0, 50);
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(trimmed));
  window.dispatchEvent(new CustomEvent("notificationsChanged"));
}

/**
 * Mark notification as read
 */
export function markAsRead(notificationId: string): void {
  if (typeof window === "undefined") return;
  const notifications = getNotifications();
  const updated = notifications.map(n => 
    n.id === notificationId ? { ...n, read: true } : n
  );
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent("notificationsChanged"));
}

/**
 * Mark all notifications as read
 */
export function markAllAsRead(): void {
  if (typeof window === "undefined") return;
  const notifications = getNotifications();
  const updated = notifications.map(n => ({ ...n, read: true }));
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent("notificationsChanged"));
}

/**
 * Clear all notifications
 */
export function clearAllNotifications(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NOTIFICATIONS_KEY, "[]");
  window.dispatchEvent(new CustomEvent("notificationsChanged"));
}

/**
 * Get unread count
 */
export function getUnreadCount(): number {
  return getNotifications().filter(n => !n.read).length;
}

/**
 * Get notification message based on type
 */
export function getNotificationMessage(notification: Notification): string {
  switch (notification.type) {
    case "rented":
      return "has been rented";
    case "paused":
      return "is temporarily unavailable";
    case "deleted":
      return "has been removed";
    case "resumed":
      return "is available again";
    default:
      return "status changed";
  }
}

/**
 * Get relative time string
 */
export function getRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
