// =============================================================================
// MITASAFI: PROVIDER MESSAGES PAGE
// =============================================================================
// Lists all bookings that have messages, ordered by most recent message.
// Each card shows the other party's name, last message preview, unread
// count, and links to the job detail page where the full chat lives.
//
// URL: /dashboard/provider/messages
// =============================================================================

import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageSquare, ChevronRight, User, Inbox } from "lucide-react";
import { getCachedUser, getCachedProviderId } from "@/lib/cache/queries";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Messages | Provider Dashboard | MitaSafi",
  description: "View all your booking conversations.",
};

// =============================================================================
// DATA
// =============================================================================

interface ConversationSummary {
  bookingId: string;
  otherPartyName: string;
  serviceName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastMessageSenderRole: string;
  unreadCount: number;
  bookingStatus: string | null;
}

async function getProviderConversations(
  providerId: string,
  userId: string
): Promise<ConversationSummary[]> {
  const admin = createAdminClient();

  // 1. Get all bookings for this provider that have at least one message
  const { data: bookings, error: bookingsError } = await admin
    .from("bookings")
    .select(
      `
      id,
      status,
      customer_id,
      service:services!service_id (
        name
      )
    `
    )
    .eq("provider_id", providerId)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (bookingsError || !bookings || bookings.length === 0) {
    return [];
  }

  const bookingIds = bookings.map((b: { id: string }) => b.id);

  // 2. Get the latest message per booking + unread counts
  // Select only needed columns + cap at 1000 rows for safety
  const { data: messages } = await admin
    .from("booking_messages")
    .select("booking_id, message, created_at, sender_role, sender_id, is_read")
    .in("booking_id", bookingIds)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (!messages || messages.length === 0) {
    return [];
  }

  // Group by booking_id — pick the latest message
  const latestByBooking = new Map<
    string,
    {
      message: string | null;
      created_at: string | null;
      sender_role: string;
      sender_id: string;
    }
  >();
  const unreadByBooking = new Map<string, number>();

  for (const msg of messages) {
    // Latest message
    if (!latestByBooking.has(msg.booking_id)) {
      latestByBooking.set(msg.booking_id, {
        message: msg.message,
        created_at: msg.created_at,
        sender_role: msg.sender_role,
        sender_id: msg.sender_id,
      });
    }
    // Unread count (messages NOT from the current user that are unread)
    if (!msg.is_read && msg.sender_id !== userId) {
      unreadByBooking.set(
        msg.booking_id,
        (unreadByBooking.get(msg.booking_id) ?? 0) + 1
      );
    }
  }

  // Only include bookings that have messages
  const bookingsWithMessages = bookings.filter(
    (b: { id: string }) => latestByBooking.has(b.id)
  );

  // 3. Fetch customer names for display
  const customerIds = [
    ...new Set(
      bookingsWithMessages.map((b: { customer_id: string }) => b.customer_id)
    ),
  ];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("id", customerIds);

  const nameMap = new Map<string, string>();
  for (const p of profiles ?? []) {
    nameMap.set(p.id, p.full_name || "Customer");
  }

  // 4. Build conversation summaries, sorted by latest message time
  const conversations: ConversationSummary[] = bookingsWithMessages
    .map((b: { id: string; status: string | null; customer_id: string; service?: { name: string } }) => {
      const latest = latestByBooking.get(b.id)!;
      return {
        bookingId: b.id,
        otherPartyName: nameMap.get(b.customer_id) ?? "Customer",
        serviceName: b.service?.name ?? "Service",
        lastMessage: latest.message,
        lastMessageAt: latest.created_at,
        lastMessageSenderRole: latest.sender_role,
        unreadCount: unreadByBooking.get(b.id) ?? 0,
        bookingStatus: b.status,
      };
    })
    .sort(
      (a: ConversationSummary, b: ConversationSummary) =>
        new Date(b.lastMessageAt ?? 0).getTime() - new Date(a.lastMessageAt ?? 0).getTime()
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

export default async function ProviderMessagesPage() {
  const { user, error: authError } = await getCachedUser();
  if (authError || !user) {
    redirect("/login?redirectTo=/dashboard/provider/messages");
  }

  const { providerId, error: providerError } = await getCachedProviderId();
  if (providerError || !providerId) {
    redirect("/dashboard");
  }

  const conversations = await getProviderConversations(providerId, user.id);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Messages</h1>
        <p className="text-sm text-gray-500 mt-1">
          Conversations with your customers across all bookings.
        </p>
      </div>

      {/* Conversation list */}
      {conversations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900">No messages yet</p>
          <p className="text-xs text-gray-500 mt-1">
            Messages from booking conversations will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {conversations.map((conv) => (
            <Link
              key={conv.bookingId}
              href={`/dashboard/provider/jobs/${conv.bookingId}`}
              className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-gray-400" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {conv.otherPartyName}
                  </p>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">
                    {formatRelativeTime(conv.lastMessageAt ?? "")}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {conv.serviceName}
                </p>
                <p className="text-sm text-gray-600 truncate mt-1">
                  {conv.lastMessageSenderRole === "provider" && (
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
    </div>
  );
}
