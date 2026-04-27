/**
 * Notifications Page
 * 
 * Full page for viewing and managing all notifications.
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NotificationsPageClient } from "./NotificationsPageClient";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/login");
  }
  
  // Fetch initial notifications server-side
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: notifications } = await (supabase as any)
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  
  return <NotificationsPageClient initialNotifications={notifications || []} />;
}
