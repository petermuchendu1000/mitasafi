// =============================================================================
// MITASAFI: CUSTOMER MESSAGES PAGE
// =============================================================================
// Lists all bookings that have messages, ordered by most recent message.
// Each card shows the provider name, service, last message preview, unread
// count, and links to the booking detail page where the full chat lives.
//
// Mirrors the provider-side messages page at /dashboard/provider/messages
// but scoped to the customer's bookings.
//
// URL: /dashboard/bookings/messages
// =============================================================================

import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MessageSquare,
  ChevronRight,
  Wrench,
  Inbox,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Messages | My Bookings | MitaSafi",
  description: "View all your booking conversations with service providers.",
};

// =============================================================================
// TYPES
// =============================================================================

interface ConversationSummary {
  bookingId: string;
  providerName: string;
  serviceName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastMessageSenderRole: string;
  unreadCount: number;
  bookingStatus: string | null;
}

// =============================================================================
// DATA
// =============================================================================

/**
 * Fetch all customer bookings that have at least one message,
 * along with the latest message and unread count for each.
 *
 * Strategy:
 *   1. Fetch bookings where customer_id = userId (max 50).
 *   2. Fetch messages for those bookings — only needed columns, capped at 1000.
 *   3. Group by booking → pick latest message + count unreads in JS.
 *   4. Resolve provider business names for display.
 */
async function getCustomerConversations(
  userId: string
): Promise<ConversationSummary[]> {
  const admin = createAdminClient();

  // 1. Get bookings for this customer, most recently updated first
  const { data: bookings, error: bookingsError } = await admin
    .from("bookings")
    .select(
      `
      id,
      status,
      provider_id,
      service:services!service_id (
        name
      )
    `
    )
    .eq("customer_id", userId)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (bookingsError || !bookings || bookings.length === 0) {
    return [];
  }

  const bookingIds = bookings.map((b: { id: string }) => b.id);

  // 2. Fetch messages for these bookings — only needed columns, newest first
  const { data: messages } = await admin
    .from("booking_messages")
    .select("booking_id, message, created_at, sender_role, sender_id, is_read")
    .in("booking_id", bookingIds)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (!messages || messages.length === 0) {
    return [];
  }

  // 3. Group by booking: pick the latest message + count unreads
  const latestByBooking = new Map<
    string,
    {
      message: string | null;
      created_at: string | null;
      sender_role: string;
    }
  >();
  const unreadByBooking = new Map<string, number>();

  for (const msg of messages) {
    if (!latestByBooking.has(msg.booking_id)) {
      latestByBooking.set(msg.booking_id, {
        message: msg.message,
        created_at: msg.created_at,
        sender_role: msg.sender_role,
      });
    }
    if (!msg.is_read && msg.sender_id !== userId) {
      unreadByBooking.set(
        msg.booking_id,
        (unreadByBooking.get(msg.booking_id) ?? 0) + 1
      );
    }
  }

  // Only include bookings that actually have messages
  const bookingsWithMessages = bookings.filter(
    (b: { id: string }) => latestByBooking.has(b.id)
  );

  // 4. Resolve provider business names
  const providerIds = [
    ...new Set(
      bookingsWithMessages
        .map((b: { provider_id: string | null }) => b.provider_id)
        .filter(Boolean)
    ),
  ] as string[];

  const providerNameMap = new Map<string, string>();

  if (providerIds.length > 0) {
    const { data: providers } = await admin
      .from("service_providers")
      .select("id, business_name")
      .in("id", providerIds);

    for (const p of providers ?? []) {
      providerNameMap.set(p.id, p.business_name || "Service Provider");
    }
  }

  // 5. Build conversation summaries, sorted by latest message time
  const conversations: ConversationSummary[] = bookingsWithMessages
    .map(
      (b: {
        id: string;
        status: string | null;
        provider_id: string | null;
        service?: { name: string };
      }) => {
        const latest = latestByBooking.get(b.id)!;
        return {
          bookingId: b.id,
          providerName: b.provider_id
            ? providerNameMap.get(b.provider_id) ?? "Service Provider"
            : "Provider pending",
          serviceName: b.service?.name ?? "Service",
          lastMessage: latest.message,
          lastMessageAt: latest.created_at,
          lastMessageSenderRole: latest.sender_role,
          unreadCount: unreadByBooking.get(b.id) ?? 0,
          bookingStatus: b.status,
        };
      }
    )
    .sort(
      (a: ConversationSummary, b: ConversationSummary) =>
        new Date(b.lastMessageAt ?? 0).getTime() -
        new Date(a.lastMessageAt ?? 0).getTime()
    );

  return conversations;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-KE", {
    month: "short",
    day: "numeric",
  });
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "…";
}

// =============================================================================
// PAGE
// =============================================================================

export default async function CustomerMessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/dashboard/bookings/messages");
  }

  const conversations = await getCustomerConversations(user.id);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex items-center h-14 gap-3">
            <Link
              href="/dashboard/bookings"
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Bookings</span>
            </Link>
            <span className="text-gray-200">|</span>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-brand-600" />
              <h1 className="text-base font-semibold text-gray-900">
                Messages
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <p className="text-sm text-gray-500 mb-5">
          All conversations with service providers across your bookings.
        </p>

        {conversations.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900">
              No messages yet
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Messages from your booking conversations will appear here.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {conversations.map((conv) => (
              <Link
                key={conv.bookingId}
                href={`/dashboard/bookings/${conv.bookingId}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group"
              >
                {/* Service icon */}
                <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0">
                  <Wrench className="w-4 h-4 text-brand-600" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {conv.providerName}
                    </p>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">
                      {formatRelativeTime(conv.lastMessageAt ?? "")}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {conv.serviceName}
                  </p>
                  <p className="text-sm text-gray-600 truncate mt-1">
                    {conv.lastMessageSenderRole === "customer" && (
                      <span className="text-gray-400">You: </span>
                    )}
                    {truncate(conv.lastMessage ?? "", 80)}
                  </p>
                </div>

                {/* Unread badge + chevron */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {conv.unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold text-white bg-brand-600 rounded-full">
                      {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
