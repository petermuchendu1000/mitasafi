/**
 * Service Provider Dashboard Home Page
 * 
 * Professional dashboard following Stripe/Linear design patterns:
 * - Clean, minimal stat cards
 * - Monochrome iconography with status indicators
 * - Generous white space
 * - Clear typography hierarchy
 */

import { getCachedUser, getProviderWithProfile, getCachedDashboardStats, getCachedRecentJobs } from "@/lib/cache/queries";
import type { RecentJob } from "@/lib/cache/queries";
import { ArrowUpRight, ArrowRight, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Suspense } from "react";
import { SocialTrafficCard } from "./SocialTrafficCard";

// =============================================================================
// HELPERS
// =============================================================================

/** Format a KES amount with commas */
function formatKES(amount: number): string {
  return `KES ${amount.toLocaleString()}`;
}

/** Calculate month-over-month growth percentage */
function calcGrowthPercent(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return 100;
  return Math.round(((current - previous) / previous) * 100);
}

/** Get time-ago string from ISO date */
function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString("en-KE", { month: "short", day: "numeric" });
}

/** Map job status to display config - minimal, professional */
function getJobStatusConfig(status: string): { color: string; bgColor: string; label: string } {
  switch (status) {
    case "pending":
      return { color: "bg-amber-500", bgColor: "bg-amber-50", label: "Pending" };
    case "quoted":
      return { color: "bg-blue-500", bgColor: "bg-blue-50", label: "Quoted" };
    case "accepted":
      return { color: "bg-teal-500", bgColor: "bg-teal-50", label: "Accepted" };
    case "scheduled":
      return { color: "bg-teal-500", bgColor: "bg-teal-50", label: "Scheduled" };
    case "in_progress":
      return { color: "bg-blue-500", bgColor: "bg-blue-50", label: "In Progress" };
    case "completed":
      return { color: "bg-emerald-500", bgColor: "bg-emerald-50", label: "Completed" };
    case "cancelled":
      return { color: "bg-gray-400", bgColor: "bg-gray-50", label: "Cancelled" };
    case "disputed":
      return { color: "bg-red-500", bgColor: "bg-red-50", label: "Disputed" };
    default:
      return { color: "bg-gray-400", bgColor: "bg-gray-50", label: status };
  }
}

/** Get display text for job time based on status */
function getJobTimeText(job: RecentJob): string {
  if (job.status === "completed" && job.completed_at) return timeAgo(job.completed_at);
  if (job.status === "scheduled" && job.scheduled_at) {
    const d = new Date(job.scheduled_at);
    const isToday = d.toDateString() === new Date().toDateString();
    const isTomorrow = d.toDateString() === new Date(Date.now() + 86400000).toDateString();
    if (isToday) return "Scheduled today";
    if (isTomorrow) return "Scheduled tomorrow";
    return `Scheduled ${d.toLocaleDateString("en-KE", { month: "short", day: "numeric" })}`;
  }
  return timeAgo(job.created_at);
}

/** Get budget display for a job */
function getJobBudget(job: RecentJob): string {
  if (job.final_amount) return formatKES(job.final_amount);
  if (job.quoted_amount) return formatKES(job.quoted_amount);
  return "—";
}

export default async function ProviderDashboardPage() {
  const { user } = await getCachedUser();
  const { data: providerData } = await getProviderWithProfile(user?.id);

  const profile = providerData?.profile ?? null;
  const provider = providerData?.provider ?? null;
  
  const verificationLevel = profile?.verification_level || "none";
  const supabasePhoneVerified = user?.phone && user?.phone_confirmed_at;
  const effectiveVerificationLevel = supabasePhoneVerified && verificationLevel === "none" 
    ? "phone" 
    : verificationLevel;
  
  const isFullyVerified = effectiveVerificationLevel === "full" || !!provider?.is_verified;
  const hasPhoneVerified = effectiveVerificationLevel !== "none";
  const hasProviderType = !!provider?.business_type;
  
  const firstName = profile?.full_name?.split(" ")[0] || "there";

  const verificationSteps = [
    { id: "phone", label: "Phone verified", done: hasPhoneVerified },
    { id: "type", label: "Account type selected", done: hasProviderType },
    { id: "identity", label: "Identity verified", done: isFullyVerified },
  ];
  const completedSteps = verificationSteps.filter(s => s.done).length;

  const providerId = provider?.id;
  const [{ stats }, { jobs: recentJobs }] = await Promise.all([
    providerId
      ? getCachedDashboardStats(providerId)
      : Promise.resolve({ stats: { completedJobs: 0, activeJobs: 0, totalEarnings: 0, thisMonthEarnings: 0, lastMonthEarnings: 0, thisMonthCompletedJobs: 0, averageRating: 0, totalReviews: 0, responseRate: 0, pendingQuotes: 0 }, error: null }),
    providerId
      ? getCachedRecentJobs(providerId, 5)
      : Promise.resolve({ jobs: [], error: null }),
  ]);

  const earningsGrowth = calcGrowthPercent(stats.thisMonthEarnings, stats.lastMonthEarnings);
  const avgPerJob = stats.thisMonthCompletedJobs > 0
    ? Math.round(stats.thisMonthEarnings / stats.thisMonthCompletedJobs)
    : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Verification Banner - Clean, minimal */}
      {!isFullyVerified && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
                Setup Progress
              </p>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Complete verification to go live
              </h2>
              
              {/* Clean Progress Steps */}
              <div className="space-y-2">
                {verificationSteps.map((step) => (
                  <div key={step.id} className="flex items-center gap-3">
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium",
                      step.done 
                        ? "bg-emerald-500 text-white" 
                        : "border-2 border-gray-300 text-gray-400"
                    )}>
                      {step.done ? "✓" : ""}
                    </div>
                    <span className={cn(
                      "text-sm",
                      step.done ? "text-gray-900" : "text-gray-500"
                    )}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
              
              <p className="text-xs text-gray-400 mt-4">
                {completedSteps} of {verificationSteps.length} steps completed
              </p>
            </div>
            
            <Link
              href="/dashboard/verify-provider"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              Continue setup
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Welcome back, {firstName}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {isFullyVerified 
              ? "Here's an overview of your business."
              : "Complete your setup to start receiving job requests."
            }
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/provider/availability"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Set availability
          </Link>
          <Link
            href="/dashboard/provider/services"
            className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
          >
            My services
          </Link>
        </div>
      </div>

      {/* Stats Grid - Clean, minimal design */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Jobs Completed</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-semibold text-gray-900">{stats.completedJobs}</p>
            {stats.thisMonthCompletedJobs > 0 && (
              <span className="text-xs text-emerald-600 font-medium">
                +{stats.thisMonthCompletedJobs} this month
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Monthly Earnings</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-semibold text-gray-900">
              {formatKES(stats.thisMonthEarnings)}
            </p>
            {earningsGrowth !== null && (
              <span className={cn(
                "flex items-center text-xs font-medium",
                earningsGrowth >= 0 ? "text-emerald-600" : "text-red-500"
              )}>
                {earningsGrowth >= 0 && <ArrowUpRight className="w-3 h-3" />}
                {earningsGrowth >= 0 ? "+" : ""}{earningsGrowth}%
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Rating</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-semibold text-gray-900">
              {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : "—"}
            </p>
            <span className="text-xs text-gray-400">
              {stats.totalReviews} reviews
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Response Rate</p>
          <p className="text-2xl font-semibold text-gray-900">
            {stats.responseRate > 0 ? `${stats.responseRate}%` : "—"}
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Jobs - 2 columns */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-medium text-gray-900">Recent Requests</h2>
            <Link
              href="/dashboard/provider/jobs"
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              View all
            </Link>
          </div>
          
          {recentJobs.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {recentJobs.map((job) => {
                const statusConfig = getJobStatusConfig(job.status);
                return (
                  <div key={job.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-gray-900 truncate">{job.title}</p>
                          {(job.priority === "urgent" || job.priority === "emergency") && (
                            <span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-xs font-medium rounded">
                              {job.priority === "emergency" ? "Emergency" : "Urgent"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span>{job.area}</span>
                          <span className="text-gray-300">|</span>
                          <span className="font-medium text-gray-700">{getJobBudget(job)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium",
                          statusConfig.bgColor,
                          "text-gray-700"
                        )}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", statusConfig.color)} />
                          {statusConfig.label}
                        </span>
                        <span className="text-xs text-gray-400">{getJobTimeText(job)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-12 text-center">
              <p className="text-gray-500 mb-1">No requests yet</p>
              <p className="text-sm text-gray-400">
                Complete your profile to start receiving job requests.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Links */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="font-medium text-gray-900 mb-3">Quick Links</h2>
            <div className="space-y-1">
              <Link
                href="/dashboard/provider/profile"
                className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-gray-50 transition-colors group"
              >
                <span className="text-sm text-gray-700">Complete Profile</span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              </Link>
              <Link
                href="/dashboard/provider/quotes"
                className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">Pending Quotes</span>
                  {stats.pendingQuotes > 0 && (
                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                      {stats.pendingQuotes}
                    </span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              </Link>
              <Link
                href="/dashboard/provider/earnings"
                className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-gray-50 transition-colors group"
              >
                <span className="text-sm text-gray-700">Earnings</span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              </Link>
            </div>
          </div>

          {/* Active Jobs */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-gray-900">Active Jobs</h2>
              <span className="text-2xl font-semibold text-gray-900">{stats.activeJobs}</span>
            </div>
            <Link
              href="/dashboard/provider/jobs?status=active"
              className="block w-full text-center py-2 text-sm font-medium text-brand-600 bg-brand-50 rounded-md hover:bg-brand-100 transition-colors"
            >
              View active jobs
            </Link>
          </div>

          {/* Earnings Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="font-medium text-gray-900 mb-4">This Month</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Total earned</span>
                <span className="text-sm font-medium text-gray-900">{formatKES(stats.thisMonthEarnings)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Jobs completed</span>
                <span className="text-sm font-medium text-gray-900">{stats.thisMonthCompletedJobs}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Avg. per job</span>
                <span className="text-sm font-medium text-gray-900">{avgPerJob > 0 ? formatKES(avgPerJob) : "—"}</span>
              </div>
            </div>
          </div>

          {/* Social Traffic */}
          {providerId && (
            <Suspense fallback={null}>
              <SocialTrafficCard providerId={providerId} />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}
