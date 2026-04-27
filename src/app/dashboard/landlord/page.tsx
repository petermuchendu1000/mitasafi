/**
 * Landlord Dashboard Home Page
 * 
 * Main dashboard view showing:
 * - Overview stats (properties, tenants, rent collected)
 * - Recent activity
 * - Quick actions
 * - Pending items (maintenance, applications)
 */

import { createClient } from "@/lib/supabase/server";
import { 
  Building2, 
  Users, 
  Wallet, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  FileText,
  Wrench,
  AlertCircle,
  CheckCircle,
  Plus,
  Megaphone,
  Home,
  MessageSquare
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default async function LandlordDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // In production, these would be real database queries
  // For now, we'll use placeholder data to demonstrate the UI
  const stats = {
    totalProperties: 3,
    totalUnits: 12,
    occupiedUnits: 10,
    occupancyRate: 83,
    totalTenants: 10,
    rentCollected: 285000,
    rentExpected: 350000,
    collectionRate: 81,
    pendingMaintenance: 2,
    pendingApplications: 1,
  };

  // Placeholder recent activity
  const recentActivity = [
    {
      id: 1,
      type: "payment",
      title: "Rent payment received",
      description: "Unit A4, Sunrise Apartments - KES 35,000",
      time: "2 hours ago",
      icon: Wallet,
      iconBg: "bg-success-100",
      iconColor: "text-success-600",
    },
    {
      id: 2,
      type: "application",
      title: "New application",
      description: "John Mwangi applied for Unit B2",
      time: "5 hours ago",
      icon: FileText,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      id: 3,
      type: "maintenance",
      title: "Maintenance request",
      description: "Plumbing issue - Unit A2",
      time: "1 day ago",
      icon: Wrench,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
    },
  ];

  // Get user's first name for greeting
  const { data: profileData } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user?.id ?? "")
    .single();
  
  const profile = profileData as { full_name: string | null } | null;
  const firstName = profile?.full_name?.split(" ")[0] || "there";

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Welcome back, {firstName}!
          </h1>
          <p className="text-gray-500 mt-1">
            Here&apos;s what&apos;s happening with your properties today.
          </p>
        </div>
        
        <div className="flex gap-3">
          <Link
            href="/dashboard/landlord/listings/new"
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg",
              "bg-cta-500 hover:bg-cta-600 text-white font-semibold text-sm",
              "transition-colors shadow-sm",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-cta-400 focus-visible:ring-offset-2"
            )}
          >
            <Megaphone className="w-5 h-5" />
            List a Vacancy
          </Link>
          <Link
            href="/dashboard/landlord/properties/new"
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg",
              "bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm",
              "transition-colors shadow-sm",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
            )}
          >
            <Home className="w-5 h-5" />
            Add Property
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Properties Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Building2 className="w-5 h-5 text-teal-600" />
            </div>
            <span className="text-sm font-medium text-gray-500">
              {stats.occupancyRate}% occupied
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-gray-900">{stats.totalUnits}</p>
            <p className="text-sm text-gray-500">Total Units</p>
          </div>
          <div className="mt-2 flex items-center gap-1 text-sm">
            <span className="text-success-600 font-medium">{stats.occupiedUnits}</span>
            <span className="text-gray-400">occupied</span>
            <span className="text-gray-300 mx-1">•</span>
            <span className="text-gray-500 font-medium">{stats.totalUnits - stats.occupiedUnits}</span>
            <span className="text-gray-400">vacant</span>
          </div>
        </div>

        {/* Tenants Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-gray-900">{stats.totalTenants}</p>
            <p className="text-sm text-gray-500">Active Tenants</p>
          </div>
          <div className="mt-2 flex items-center gap-1 text-sm text-success-600">
            <ArrowUpRight className="w-4 h-4" />
            <span className="font-medium">+2 this month</span>
          </div>
        </div>

        {/* Rent Collection Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-success-100 rounded-lg">
              <Wallet className="w-5 h-5 text-success-600" />
            </div>
            <span className={cn(
              "text-sm font-medium",
              stats.collectionRate >= 80 ? "text-success-600" : "text-orange-500"
            )}>
              {stats.collectionRate}% collected
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-gray-900">
              KES {stats.rentCollected.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">Rent This Month</p>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            of KES {stats.rentExpected.toLocaleString()} expected
          </div>
        </div>

        {/* Pending Items Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-gray-900">
              {stats.pendingMaintenance + stats.pendingApplications}
            </p>
            <p className="text-sm text-gray-500">Pending Items</p>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm">
            {stats.pendingMaintenance > 0 && (
              <span className="flex items-center gap-1 text-orange-600">
                <Wrench className="w-3.5 h-3.5" />
                {stats.pendingMaintenance}
              </span>
            )}
            {stats.pendingApplications > 0 && (
              <span className="flex items-center gap-1 text-blue-600">
                <FileText className="w-3.5 h-3.5" />
                {stats.pendingApplications}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Activity</h2>
            <Link 
              href="/dashboard/landlord/activity"
              className="text-sm text-teal-600 hover:text-teal-700 font-medium"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentActivity.map((activity) => {
              const ActivityIcon = activity.icon;
              return (
                <div key={activity.id} className="px-5 py-4 flex items-start gap-4">
                  <div className={cn("p-2 rounded-lg", activity.iconBg)}>
                    <ActivityIcon className={cn("w-4 h-4", activity.iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{activity.title}</p>
                    <p className="text-sm text-gray-500 truncate">{activity.description}</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {activity.time}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-3 space-y-2">
            <Link
              href="/dashboard/landlord/listings/new"
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg",
                "text-gray-700 hover:bg-cta-50 transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-cta-500"
              )}
            >
              <div className="p-2 bg-cta-100 rounded-lg">
                <Megaphone className="w-4 h-4 text-cta-600" />
              </div>
              <div>
                <span className="font-medium">List a Vacancy</span>
                <p className="text-xs text-gray-500">Advertise your empty unit</p>
              </div>
            </Link>
            
            <Link
              href="/dashboard/landlord/properties/new"
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg",
                "text-gray-700 hover:bg-brand-50 transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              )}
            >
              <div className="p-2 bg-brand-100 rounded-lg">
                <Home className="w-4 h-4 text-brand-600" />
              </div>
              <div>
                <span className="font-medium">Add Property</span>
                <p className="text-xs text-gray-500">Register a property to manage</p>
              </div>
            </Link>
            
            <Link
              href="/dashboard/landlord/tenants"
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg",
                "text-gray-700 hover:bg-gray-50 transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              )}
            >
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <span className="font-medium">View All Tenants</span>
            </Link>
            
            <Link
              href="/dashboard/inquiries"
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg",
                "text-gray-700 hover:bg-orange-50 transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              )}
            >
              <div className="p-2 bg-orange-100 rounded-lg">
                <MessageSquare className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <span className="font-medium">Inquiries</span>
                <p className="text-xs text-gray-500">View tenant leads</p>
              </div>
            </Link>
            
            <Link
              href="/dashboard/landlord/rent"
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg",
                "text-gray-700 hover:bg-gray-50 transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              )}
            >
              <div className="p-2 bg-success-100 rounded-lg">
                <Wallet className="w-4 h-4 text-success-600" />
              </div>
              <span className="font-medium">Collect Rent</span>
            </Link>
            
            <Link
              href="/dashboard/landlord/maintenance"
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg",
                "text-gray-700 hover:bg-gray-50 transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              )}
            >
              <div className="p-2 bg-orange-100 rounded-lg">
                <Wrench className="w-4 h-4 text-orange-600" />
              </div>
              <span className="font-medium">Maintenance Requests</span>
              {stats.pendingMaintenance > 0 && (
                <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-orange-100 text-orange-600 rounded-full">
                  {stats.pendingMaintenance}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Alerts Section (if any) */}
      {(stats.collectionRate < 80 || stats.pendingMaintenance > 0) && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900">Attention Needed</h2>
          
          {stats.collectionRate < 80 && (
            <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-orange-800">
                  Rent collection below target
                </p>
                <p className="text-sm text-orange-700 mt-0.5">
                  {100 - stats.collectionRate}% of expected rent is still outstanding. 
                  Consider sending reminders to tenants.
                </p>
              </div>
              <Link
                href="/dashboard/landlord/rent"
                className="text-sm font-medium text-orange-600 hover:text-orange-700 whitespace-nowrap"
              >
                View details →
              </Link>
            </div>
          )}
          
          {stats.pendingMaintenance > 0 && (
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <Wrench className="w-5 h-5 text-blue-500 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-blue-800">
                  {stats.pendingMaintenance} maintenance request{stats.pendingMaintenance !== 1 ? 's' : ''} pending
                </p>
                <p className="text-sm text-blue-700 mt-0.5">
                  Review and assign these requests to service providers.
                </p>
              </div>
              <Link
                href="/dashboard/landlord/maintenance"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
              >
                Review →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
