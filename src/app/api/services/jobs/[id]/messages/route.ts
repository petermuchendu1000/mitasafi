// =============================================================================
// MITASAFI: BOOKING MESSAGES API
// =============================================================================
// GET  /api/services/jobs/[id]/messages — Fetch messages for a booking
// POST /api/services/jobs/[id]/messages — Send a new message
//
// Both endpoints verify the caller is a participant (customer or provider)
// via the session-aware server client + RLS, and the explicit participant
// check in the data layer.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getBookingMessages,
  getBookingParticipantRole,
  markMessagesAsRead,
} from "@/lib/services/messages";
import { notifyNewMessage } from "@/lib/notifications/triggers";

// =============================================================================
// GET — Fetch messages
// =============================================================================

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: bookingId } = await context.params;

    // Authenticate
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify participant access
    const { role, error: roleError } = await getBookingParticipantRole(
      bookingId,
      user.id
    );

    if (!role || roleError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? "50", 10),
      100
    );
    const before = searchParams.get("before") ?? undefined;
    const markRead = searchParams.get("markRead") === "true";

    // Fetch messages
    const result = await getBookingMessages({
      bookingId,
      limit,
      before,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Optionally mark unread messages as read (when user opens chat)
    if (markRead) {
      markMessagesAsRead(bookingId, user.id).catch((err) => {
        console.error("[Messages API] Background mark-read failed:", err);
      });
    }

    return NextResponse.json({
      messages: result.messages,
      hasMore: result.hasMore,
    });
  } catch (err) {
    console.error("[Messages API] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST — Send a message
// =============================================================================

interface SendMessageBody {
  message: string;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: bookingId } = await context.params;

    // Authenticate
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse & validate body
    const body: SendMessageBody = await request.json();
    const messageText = body.message?.trim();

    if (!messageText) {
      return NextResponse.json(
        { error: "Message text is required." },
        { status: 400 }
      );
    }

    if (messageText.length > 5000) {
      return NextResponse.json(
        { error: "Message must be 5000 characters or fewer." },
        { status: 400 }
      );
    }

    // Verify participant access and determine sender role
    const { role, booking, providerUserId, error: roleError } =
      await getBookingParticipantRole(bookingId, user.id);

    if (!role || !booking || roleError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Insert message via admin client (to also fire the notification)
    const admin = createAdminClient();

    const { data: newMessage, error: insertError } = await admin
      .from("booking_messages")
      .insert({
        booking_id: bookingId,
        sender_id: user.id,
        sender_role: role,
        message: messageText,
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("[Messages API] Insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to send message." },
        { status: 500 }
      );
    }

    // Resolve sender name for notification
    const { data: senderProfile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const senderName = senderProfile?.full_name || "Someone";

    // Determine the OTHER party to notify
    const recipientUserId =
      role === "customer" ? providerUserId : booking.customer_id;

    const recipientRole: "customer" | "provider" =
      role === "customer" ? "provider" : "customer";

    // Fire notification asynchronously (don't block the response)
    if (recipientUserId) {
      notifyNewMessage({
        recipientUserId,
        recipientRole,
        bookingId,
        senderName,
        messagePreview: messageText,
      }).catch((err) => {
        console.error("[Messages API] Notification failed:", err);
      });
    }

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (err) {
    console.error("[Messages API] POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
