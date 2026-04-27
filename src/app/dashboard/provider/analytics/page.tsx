/**
 * Provider Analytics Page
 *
 * Server component that fetches analytics data and renders the dashboard.
 * Auth is handled by the parent layout (provider/layout.tsx), so we only
 * need to fetch the analytics-specific data here.
 *
 * URL: /dashboard/provider/analytics
 */

import { Metadata } from "next";
import { getProviderAnalytics } from "./actions";
import { AnalyticsDashboard } from "./AnalyticsDashboard";
import { BarChart3 } from "lucide-react";

export const metadata: Metadata = {
  title: "Analytics | MitaSafi Provider",
  description: "View your performance analytics, conversion rates, and trends.",
};

export default async function ProviderAnalyticsPage() {
  const { success, data, error } = await getProviderAnalytics();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Track your performance over the last 6 months.
        </p>
      </div>

      {/* Error state */}
      {!success || !data ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="p-3 rounded-full bg-gray-100 w-12 h-12 flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-1">
            Unable to load analytics
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {error || "Something went wrong. Please try again later."}
          </p>
        </div>
      ) : (
        <AnalyticsDashboard data={data} />
      )}
    </div>
  );
}
