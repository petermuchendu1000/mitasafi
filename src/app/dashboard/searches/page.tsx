/**
 * Saved Searches Dashboard Page
 * 
 * Shows user's saved search alerts with ability to:
 * - View all saved searches
 * - Edit notification preferences
 * - Delete saved searches
 * - See matching listings count for each search
 */

import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader, SavedSearchesList } from "@/components/dashboard";
import type { UserRole } from "@/types/db-helpers";
import { Bell, Plus } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Saved Searches | MitaSafi Dashboard",
  description: "Manage your saved searches and notification preferences",
};

// Force dynamic rendering
export const dynamic = "force-dynamic";

interface SearchAlertRow {
  id: string;
  name: string | null;
  areas: string[] | null;
  property_types: string[] | null;
  bedrooms_min: number | null;
  bedrooms_max: number | null;
  price_min: number | null;
  price_max: number | null;
  verified_only: boolean | null;
  frequency: string;
  notify_email: boolean;
  notify_sms: boolean;
  created_at: string;
  last_triggered_at: string | null;
  matches_count: number | null;
  source: string | null;
  source_listing_id: string | null;
}

export default async function SavedSearchesPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/login");
  }

  // Get user profile
  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const profile = profileData as {
    id: string;
    email: string;
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
    primary_role: string | null;
  } | null;

  // Get user roles
  const { data: rolesData } = await supabase
    .from("user_roles")
    .select("role, is_verified")
    .eq("user_id", user.id)
    .eq("is_active", true);

  const userRoles: { role: UserRole; is_verified: boolean }[] = 
    rolesData?.map((r: { role: string; is_verified: boolean | null }) => ({
      role: r.role as UserRole,
      is_verified: r.is_verified ?? false,
    })) || [];

  const userName = profile?.full_name || user.email?.split("@")[0] || "User";
  const currentRole = (userRoles[0]?.role || "tenant") as UserRole;

  // Get user's saved searches
  const { data: searchesData } = await supabase
    .from("search_alerts")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  // Type the searches data
  const savedSearches: SearchAlertRow[] = (searchesData as SearchAlertRow[] | null) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="text-xl font-bold text-brand-600">MitaSafi</span>
            </Link>

            {/* User Menu */}
            <DashboardHeader
              userName={userName}
              userEmail={user.email || ""}
              avatarUrl={profile?.avatar_url}
              currentRole={currentRole}
              allRoles={userRoles}
            />
          </div>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Saved Searches</h1>
            <p className="text-gray-600 mt-1">
              Get notified when new properties match your criteria
            </p>
          </div>
          <Link
            href="/properties"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Search
          </Link>
        </div>

        {/* Searches List */}
        {savedSearches.length === 0 ? (
          <EmptyState />
        ) : (
          <SavedSearchesList searches={savedSearches} />
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
      <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
        <Bell className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No saved searches yet
      </h3>
      <p className="text-gray-600 max-w-md mx-auto mb-6">
        Save a search on the properties page to get notified when new listings match your criteria.
      </p>
      <Link
        href="/properties"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg transition-colors"
      >
        Browse Properties
      </Link>
    </div>
  );
}
