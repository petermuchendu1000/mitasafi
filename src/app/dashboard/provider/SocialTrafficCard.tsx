/**
 * Social Traffic Card
 *
 * Dashboard widget showing social link click analytics.
 * Displays total clicks, per-platform breakdown, and trend.
 * Server component — fetches data directly.
 */

import { getSocialClickStats } from "@/lib/services/social-analytics";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Brand colors for platform pills
const PLATFORM_COLORS: Record<string, string> = {
  website: "bg-gray-100 text-gray-700",
  facebook: "bg-blue-50 text-blue-700",
  instagram: "bg-pink-50 text-pink-700",
  tiktok: "bg-gray-100 text-gray-900",
  twitter: "bg-gray-100 text-gray-900",
  linkedin: "bg-sky-50 text-sky-700",
  youtube: "bg-red-50 text-red-700",
};

const PLATFORM_LABELS: Record<string, string> = {
  website: "Website",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  twitter: "X",
  linkedin: "LinkedIn",
  youtube: "YouTube",
};

interface SocialTrafficCardProps {
  providerId: string;
}

export async function SocialTrafficCard({ providerId }: SocialTrafficCardProps) {
  const stats = await getSocialClickStats(providerId, 30);

  // Don't render if there's no click data at all
  if (stats.totalClicks === 0 && stats.changePercent === null) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium text-gray-900">Social Traffic</h2>
        <span className="text-xs text-gray-400">Last 30 days</span>
      </div>

      {/* Total clicks */}
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-2xl font-semibold text-gray-900">
          {stats.totalClicks.toLocaleString()}
        </span>
        <span className="text-sm text-gray-500">
          click{stats.totalClicks !== 1 ? "s" : ""}
        </span>
        {stats.changePercent !== null && (
          <span
            className={cn(
              "flex items-center text-xs font-medium ml-auto",
              stats.changePercent >= 0 ? "text-emerald-600" : "text-red-500"
            )}
          >
            {stats.changePercent >= 0 && <ArrowUpRight className="w-3 h-3" />}
            {stats.changePercent >= 0 ? "+" : ""}
            {stats.changePercent}%
          </span>
        )}
      </div>

      {/* Sparkline — simple bar chart */}
      {stats.daily.length > 0 && (
        <div className="flex items-end gap-px h-8 mb-4">
          {(() => {
            const maxClicks = Math.max(...stats.daily.map((d) => d.clicks), 1);
            return stats.daily.map((d) => (
              <div
                key={d.date}
                className={cn(
                  "flex-1 rounded-sm min-w-[2px]",
                  d.clicks > 0 ? "bg-teal-400" : "bg-gray-100"
                )}
                style={{ height: `${Math.max((d.clicks / maxClicks) * 100, 4)}%` }}
                title={`${d.date}: ${d.clicks} click${d.clicks !== 1 ? "s" : ""}`}
              />
            ));
          })()}
        </div>
      )}

      {/* Platform breakdown */}
      {stats.byPlatform.length > 0 && (
        <div className="space-y-2">
          {stats.byPlatform.map(({ platform, clicks }) => (
            <div key={platform} className="flex items-center justify-between">
              <span
                className={cn(
                  "px-2 py-0.5 rounded text-xs font-medium",
                  PLATFORM_COLORS[platform] || "bg-gray-100 text-gray-700"
                )}
              >
                {PLATFORM_LABELS[platform] || platform}
              </span>
              <span className="text-sm font-medium text-gray-700">
                {clicks.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
