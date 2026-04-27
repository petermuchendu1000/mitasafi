/**
 * AnalyticsDashboard — Client Component
 *
 * Renders the provider analytics dashboard with:
 *   - Monthly completed jobs bar chart
 *   - Monthly revenue bar chart
 *   - Conversion funnel
 *   - Top services by revenue
 *   - Rating breakdown (overall + dimensions)
 *   - Response time stats
 *
 * All charts are built with pure SVG + Tailwind (no chart library dependency).
 * Design follows the Stripe/Linear aesthetic used across the provider dashboard.
 */

"use client";

import {
  BarChart3,
  TrendingUp,
  Filter,
  Star,
  Clock,
  ArrowRight,
  Zap,
} from "lucide-react";
import type {
  AnalyticsData,
  MonthlyDataPoint,
  ConversionFunnel,
  TopService,
  RatingBreakdown,
  ResponseTimeStats,
} from "./actions";

// =============================================================================
// PROPS
// =============================================================================

interface AnalyticsDashboardProps {
  data: AnalyticsData;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatKES(amount: number): string {
  if (amount >= 1_000_000) return `KES ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `KES ${(amount / 1_000).toFixed(1)}K`;
  return `KES ${amount.toLocaleString()}`;
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// =============================================================================
// SECTION WRAPPER
// =============================================================================

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100">
        <div className="p-1.5 rounded-lg bg-gray-100">
          <Icon className="w-3.5 h-3.5 text-gray-500" />
        </div>
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// =============================================================================
// BAR CHART (lightweight SVG)
// =============================================================================

function BarChart({
  data,
  formatValue,
  accentColor = "bg-teal-500",
}: {
  data: MonthlyDataPoint[];
  formatValue: (v: number) => string;
  accentColor?: string;
}) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-gray-900 tabular-nums">
          {formatValue(data.reduce((s, d) => s + d.value, 0))}
        </span>
        <span className="text-xs text-gray-500">last 6 months</span>
      </div>

      {/* Bars */}
      <div className="flex items-end gap-1.5 h-32">
        {data.map((d) => {
          const height = maxValue > 0 ? (d.value / maxValue) * 100 : 0;
          return (
            <div
              key={d.month}
              className="flex-1 flex flex-col items-center gap-1"
            >
              <span className="text-[10px] text-gray-400 tabular-nums">
                {d.value > 0 ? formatValue(d.value) : ""}
              </span>
              <div className="w-full flex items-end" style={{ height: "100px" }}>
                <div
                  className={`w-full rounded-t ${accentColor} transition-all duration-300`}
                  style={{
                    height: `${Math.max(height, d.value > 0 ? 4 : 0)}%`,
                    minHeight: d.value > 0 ? "4px" : "0px",
                  }}
                />
              </div>
              <span className="text-[10px] text-gray-500 font-medium">
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// CONVERSION FUNNEL
// =============================================================================

function FunnelChart({ funnel }: { funnel: ConversionFunnel }) {
  const steps = [
    { label: "Requests", value: funnel.totalRequests, color: "bg-gray-400" },
    { label: "Quoted", value: funnel.quoted, color: "bg-blue-400" },
    { label: "Accepted", value: funnel.accepted, color: "bg-teal-400" },
    { label: "Completed", value: funnel.completed, color: "bg-emerald-500" },
  ];

  const maxValue = Math.max(funnel.totalRequests, 1);

  return (
    <div className="space-y-3">
      {steps.map((step, i) => {
        const widthPct = Math.max((step.value / maxValue) * 100, 4);
        const conversionRate =
          i > 0 && steps[i - 1].value > 0
            ? Math.round((step.value / steps[i - 1].value) * 100)
            : null;

        return (
          <div key={step.label}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 font-medium">
                  {step.label}
                </span>
                {conversionRate !== null && (
                  <span className="text-[10px] text-gray-400">
                    {conversionRate}% of prev
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-900 font-medium tabular-nums">
                {step.value}
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${step.color} rounded-full transition-all duration-500`}
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </div>
        );
      })}

      {/* Overall conversion */}
      {funnel.totalRequests > 0 && (
        <div className="pt-2 border-t border-gray-100 flex items-center gap-2">
          <ArrowRight className="w-3 h-3 text-gray-400" />
          <span className="text-xs text-gray-500">
            Overall conversion:{" "}
            <span className="font-medium text-gray-900">
              {Math.round((funnel.completed / funnel.totalRequests) * 100)}%
            </span>
          </span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// TOP SERVICES TABLE
// =============================================================================

function TopServicesTable({ services }: { services: TopService[] }) {
  if (services.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-6">
        No completed jobs yet
      </p>
    );
  }

  const maxRevenue = Math.max(...services.map((s) => s.revenue), 1);

  return (
    <div className="space-y-3">
      {services.map((service, i) => {
        const widthPct = (service.revenue / maxRevenue) * 100;

        return (
          <div key={service.serviceId} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-gray-400 font-medium w-4 shrink-0">
                  {i + 1}.
                </span>
                <span className="text-sm text-gray-900 truncate">
                  {service.serviceName}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                <span className="text-xs text-gray-500 tabular-nums">
                  {service.completedJobs} jobs
                </span>
                <span className="text-sm font-medium text-gray-900 tabular-nums">
                  {formatKES(service.revenue)}
                </span>
              </div>
            </div>
            <div className="ml-6 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// RATING BREAKDOWN
// =============================================================================

function RatingBreakdownCard({ breakdown }: { breakdown: RatingBreakdown }) {
  if (breakdown.totalReviews === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-6">No reviews yet</p>
    );
  }

  const maxCount = Math.max(...Object.values(breakdown.distribution), 1);

  const dimensionLabels: Array<{
    key: keyof RatingBreakdown["dimensions"];
    label: string;
  }> = [
    { key: "quality", label: "Quality" },
    { key: "communication", label: "Communication" },
    { key: "timeliness", label: "Timeliness" },
    { key: "professionalism", label: "Professionalism" },
    { key: "value", label: "Value" },
  ];

  return (
    <div className="space-y-5">
      {/* Overall */}
      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="text-3xl font-semibold text-gray-900 tabular-nums">
            {breakdown.overall.toFixed(1)}
          </div>
          <div className="flex items-center gap-0.5 mt-1 justify-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-3.5 h-3.5 ${
                  star <= Math.round(breakdown.overall)
                    ? "text-amber-400 fill-amber-400"
                    : "text-gray-200"
                }`}
              />
            ))}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {breakdown.totalReviews} reviews
          </div>
        </div>

        {/* Distribution bars */}
        <div className="flex-1 space-y-1">
          {([5, 4, 3, 2, 1] as const).map((star) => (
            <div key={star} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-3 text-right tabular-nums">
                {star}
              </span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-500"
                  style={{
                    width: `${(breakdown.distribution[star] / maxCount) * 100}%`,
                  }}
                />
              </div>
              <span className="text-[10px] text-gray-400 w-5 text-right tabular-nums">
                {breakdown.distribution[star]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Dimension ratings */}
      <div className="border-t border-gray-100 pt-4 space-y-2.5">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
          Dimension Ratings
        </p>
        {dimensionLabels.map((dim) => {
          const val = breakdown.dimensions[dim.key];
          return (
            <div key={dim.key} className="flex items-center gap-3">
              <span className="text-xs text-gray-600 w-28 shrink-0">
                {dim.label}
              </span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-400 rounded-full transition-all duration-500"
                  style={{ width: `${(val / 5) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-900 font-medium tabular-nums w-6 text-right">
                {val > 0 ? val.toFixed(1) : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// RESPONSE TIME
// =============================================================================

function ResponseTimeCard({ stats }: { stats: ResponseTimeStats }) {
  if (stats.sampleSize === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-6">
        No response data yet
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-semibold text-gray-900 tabular-nums">
            {formatMinutes(stats.averageMinutes)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Avg. response</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-semibold text-gray-900 tabular-nums">
            {formatMinutes(stats.medianMinutes)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Median response</div>
        </div>
      </div>
      <div className="border-t border-gray-100 pt-3">
        <p className="text-xs text-gray-500 text-center">
          Based on{" "}
          <span className="font-medium text-gray-700">
            {stats.sampleSize}
          </span>{" "}
          bookings in the last 6 months
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AnalyticsDashboard({ data }: AnalyticsDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Top row: two charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Completed Jobs" icon={BarChart3}>
          <BarChart
            data={data.monthlyJobs}
            formatValue={(v) => String(v)}
            accentColor="bg-teal-500"
          />
        </Section>

        <Section title="Revenue" icon={TrendingUp}>
          <BarChart
            data={data.monthlyRevenue}
            formatValue={formatKES}
            accentColor="bg-emerald-500"
          />
        </Section>
      </div>

      {/* Middle row: funnel + top services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Conversion Funnel" icon={Filter}>
          <FunnelChart funnel={data.funnel} />
        </Section>

        <Section title="Top Services by Revenue" icon={Zap}>
          <TopServicesTable services={data.topServices} />
        </Section>
      </div>

      {/* Bottom row: ratings + response time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Rating Breakdown" icon={Star}>
          <RatingBreakdownCard breakdown={data.ratingBreakdown} />
        </Section>

        <Section title="Response Time" icon={Clock}>
          <ResponseTimeCard stats={data.responseTime} />
        </Section>
      </div>
    </div>
  );
}
