/**
 * Real-time Notifications Hook
 * 
 * PURPOSE:
 * Provides real-time notifications by subscribing to the notifications table.
 * This is the PROPER architecture:
 * - Database triggers create notifications when events happen (inquiry, status change)
 * - This hook subscribes to notifications table filtered by user_id
 * - Works whether user is online or offline - notifications persist server-side
 * 
 * ARCHITECTURE:
 * Event (inquiry/status change) → Database Trigger → INSERT into notifications
 *                                                          ↓
 *                                               Supabase Realtime
 *                                                          ↓
 *                                               This hook receives it
 *                                                          ↓
 *                                               UI updates (toast, badge, list)
 */

"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel, RealtimePostgresInsertPayload } from "@supabase/supabase-js";

// Notification types matching database CHECK constraint
export type NotificationType = 
  | 'new_inquiry'
  | 'inquiry_response'
  | 'listing_status_change'
  | 'viewing_scheduled'
  | 'viewing_reminder'
  | 'application_received'
  | 'application_update'
  | 'payment_received'
  | 'payment_due'
  | 'lease_expiring'
  | 'maintenance_update'
  | 'system'
  // Booking notification types (from lib/notifications/triggers.ts)
  | 'booking_new'
  | 'booking_accepted'
  | 'booking_cancelled'
  | 'booking_cancelled_by_customer'
  | 'quote_sent'
  | 'quote_accepted'
  | 'quote_rejected'
  | 'new_message'
  | 'job_scheduled'
  | 'job_started'
  | 'job_completed'
  | 'completion_confirmed'
  | 'payment_confirmed'
  | 'payment_failed'
  | 'payout_completed'
  | 'review_new'
  | 'review_response'
  | 'review_prompt'
  // Dispute & refund types
  | 'dispute_filed'
  | 'dispute_updated'
  | 'refund_processed'
  // System types
  | 'system_announcement'
  | 'account_update';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  entity_type: 'listing' | 'inquiry' | 'application' | 'lease' | 'payment' | 'maintenance' | null;
  entity_id: string | null;
  action_url: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
  expires_at: string | null;
}

interface UseNotificationsOptions {
  /** Callback fired when a new notification arrives */
  onNotification?: (notification: Notification) => void;
  /** Whether to auto-fetch existing notifications on mount */
  fetchOnMount?: boolean;
  /** Limit for initial fetch */
  limit?: number;
}

interface UseNotificationsReturn {
  /** All notifications (newest first) */
  notifications: Notification[];
  /** Unread notifications count */
  unreadCount: number;
  /** Most recent notification (for toast display) */
  latestNotification: Notification | null;
  /** Whether initial fetch is loading */
  isLoading: boolean;
  /** Whether realtime is connected */
  isConnected: boolean;
  /** Connection status */
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  /** Error message if any */
  error: string | null;
  /** Mark a notification as read */
  markAsRead: (notificationId: string) => Promise<void>;
  /** Mark all notifications as read */
  markAllAsRead: () => Promise<void>;
  /** Delete a notification */
  deleteNotification: (notificationId: string) => Promise<void>;
  /** Refresh notifications from server */
  refresh: () => Promise<void>;
}

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const { onNotification, fetchOnMount = true, limit = 50 } = options;
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [latestNotification, setLatestNotification] = useState<Notification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onNotificationRef = useRef(onNotification);
  const supabase = useMemo(() => createClient(), []);
  
  // Keep callback ref updated
  useEffect(() => {
    onNotificationRef.current = onNotification;
  }, [onNotification]);
  
  // Computed unread count
  const unreadCount = useMemo(() => 
    notifications.filter(n => n.read_at === null).length,
    [notifications]
  );
  
  // Fetch notifications from server
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: fetchError } = await (supabase as any)
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (fetchError) {
        console.error('[useNotifications] Fetch error:', fetchError);
        setError('Failed to load notifications');
        return;
      }
      
      setNotifications(data || []);
      setError(null);
    } catch (err) {
      console.error('[useNotifications] Fetch error:', err);
      setError('Failed to load notifications');
    }
  }, [userId, supabase, limit]);
  
  // Public refresh method
  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchNotifications();
    setIsLoading(false);
  }, [fetchNotifications]);
  
  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => 
      n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
    ));
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);
    
    if (updateError) {
      console.error('[useNotifications] Mark read error:', updateError);
      // Revert optimistic update
      await fetchNotifications();
    }
  }, [supabase, fetchNotifications]);
  
  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null);
    
    if (updateError) {
      console.error('[useNotifications] Mark all read error:', updateError);
      await fetchNotifications();
    }
  }, [supabase, userId, fetchNotifications]);
  
  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    // Optimistic update
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (supabase as any)
      .from('notifications')
      .delete()
      .eq('id', notificationId);
    
    if (deleteError) {
      console.error('[useNotifications] Delete error:', deleteError);
      await fetchNotifications();
    }
  }, [supabase, fetchNotifications]);
  
  // Initialize: get user and set up subscription
  useEffect(() => {
    let mounted = true;
    
    const initialize = async () => {
      setConnectionStatus('connecting');
      
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        if (mounted) {
          setIsLoading(false);
          setConnectionStatus('disconnected');
          setError('Authentication required');
        }
        return;
      }
      
      if (mounted) {
        setUserId(user.id);
      }
      
      // Fetch existing notifications
      if (fetchOnMount) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: fetchError } = await (supabase as any)
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (mounted) {
          if (fetchError) {
            setError('Failed to load notifications');
          } else {
            setNotifications(data || []);
          }
          setIsLoading(false);
        }
      }
      
      // Set up realtime subscription
      const channel = supabase
        .channel(`notifications-${user.id}`)
        .on<Notification>(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload: RealtimePostgresInsertPayload<Notification>) => {
            const newNotification = payload.new;
            
            // Add to state
            setNotifications(prev => [newNotification, ...prev]);
            
            // Set as latest (for toast display)
            setLatestNotification(newNotification);
            
            // Call callback
            if (onNotificationRef.current) {
              onNotificationRef.current(newNotification);
            }
            
            // Dispatch global event
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('notification', { detail: newNotification }));
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const updated = payload.new as Notification;
            setNotifications(prev => prev.map(n => n.id === updated.id ? updated : n));
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const deleted = payload.old as { id: string };
            setNotifications(prev => prev.filter(n => n.id !== deleted.id));
          }
        )
        .subscribe((status) => {
          if (!mounted) return;
          
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            setConnectionStatus('connected');
            setError(null);
          } else if (status === 'CHANNEL_ERROR') {
            setIsConnected(false);
            setConnectionStatus('error');
            setError('Connection error');
          } else if (status === 'TIMED_OUT') {
            setIsConnected(false);
            setConnectionStatus('error');
            setError('Connection timed out');
          } else if (status === 'CLOSED') {
            setIsConnected(false);
            setConnectionStatus('disconnected');
          }
        });
      
      channelRef.current = channel;
    };
    
    initialize();
    
    // Cleanup
    return () => {
      mounted = false;
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [supabase, fetchOnMount, limit]);
  
  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        if (channelRef.current) {
          channelRef.current.unsubscribe();
          channelRef.current = null;
        }
        setNotifications([]);
        setUserId(null);
        setIsConnected(false);
        setConnectionStatus('disconnected');
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);
  
  return {
    notifications,
    unreadCount,
    latestNotification,
    isLoading,
    isConnected,
    connectionStatus,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
  };
}

/**
 * Lightweight hook for just the unread count
 * Uses the same realtime subscription but only exposes count
 */
export function useUnreadNotificationCount(): number {
  const { unreadCount } = useNotifications({ fetchOnMount: true, limit: 100 });
  return unreadCount;
}
