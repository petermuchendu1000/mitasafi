/**
 * Notifications API Route
 * 
 * GET /api/notifications - Get user's notifications
 * PATCH /api/notifications - Mark notification(s) as read
 * DELETE /api/notifications - Delete notification(s)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const unreadOnly = searchParams.get("unread") === "true";
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    
    if (unreadOnly) {
      query = query.is("read_at", null);
    }
    
    const { data: notifications, error } = await query;
    
    if (error) {
      console.error("[Notifications API] Fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
    }
    
    // Get unread count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: unreadCount } = await (supabase as any)
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null);
    
    return NextResponse.json({
      notifications: notifications || [],
      unreadCount: unreadCount || 0,
    });
  } catch (error) {
    console.error("[Notifications API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    
    const body = await request.json();
    const { notificationId, markAll } = body;
    
    if (markAll) {
      // Mark all as read
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("read_at", null);
      
      if (error) {
        console.error("[Notifications API] Mark all read error:", error);
        return NextResponse.json({ error: "Failed to mark notifications as read" }, { status: 500 });
      }
      
      return NextResponse.json({ success: true, message: "All notifications marked as read" });
    }
    
    if (notificationId) {
      // Mark single notification as read
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notificationId)
        .eq("user_id", user.id);
      
      if (error) {
        console.error("[Notifications API] Mark read error:", error);
        return NextResponse.json({ error: "Failed to mark notification as read" }, { status: 500 });
      }
      
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: "Missing notificationId or markAll" }, { status: 400 });
  } catch (error) {
    console.error("[Notifications API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get("id");
    const deleteAll = searchParams.get("all") === "true";
    
    if (deleteAll) {
      // Delete all read notifications (keep unread)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("notifications")
        .delete()
        .eq("user_id", user.id)
        .not("read_at", "is", null);
      
      if (error) {
        console.error("[Notifications API] Delete all error:", error);
        return NextResponse.json({ error: "Failed to delete notifications" }, { status: 500 });
      }
      
      return NextResponse.json({ success: true, message: "Read notifications deleted" });
    }
    
    if (notificationId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("notifications")
        .delete()
        .eq("id", notificationId)
        .eq("user_id", user.id);
      
      if (error) {
        console.error("[Notifications API] Delete error:", error);
        return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 });
      }
      
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: "Missing notification id" }, { status: 400 });
  } catch (error) {
    console.error("[Notifications API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
