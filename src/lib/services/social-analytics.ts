/**
 * Social Link Click Analytics
 *
 * Server-side query functions for the provider dashboard.
 * Reads from social_link_clicks table via RLS (provider sees own data).
 */

/**
 * Untyped Supabase client for reading social_link_clicks.
 * Uses the anon key + cookie auth via server-side (RLS applies).
 * The table is not in the generated Database types yet.
 */
async function getUntypedClient() {
  // Dynamic import to get the server createClient with cookies
  const { createClient: createServerClient } = await import("@/lib/supabase/server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createServerClient() as any;
}

export interface SocialClickSummary {
  /** Total clicks across all platforms in the period */
  totalClicks: number;
  /** Clicks grouped by platform */
  byPlatform: { platform: string; clicks: number }[];
  /** Clicks per day for the last 30 days (for sparkline / chart) */
  daily: { date: string; clicks: number }[];
  /** Change vs previous period (percentage, null if no data) */
  changePercent: number | null;
}

/**
 * Get social click analytics for a provider.
 * Uses Supabase RLS — the authenticated user can only see their own provider's data.
 *
 * @param providerId - The provider's UUID
 * @param days - Number of days to look back (default 30)
 */
export async function getSocialClickStats(
  providerId: string,
  days: number = 30
): Promise<SocialClickSummary> {
  const supabase = await getUntypedClient();

  const now = new Date();
  const periodStart = new Date(now.getTime() - days * 86_400_000);
  const prevPeriodStart = new Date(periodStart.getTime() - days * 86_400_000);

  const periodStartISO = periodStart.toISOString();
  const prevPeriodStartISO = prevPeriodStart.toISOString();

  // Fetch all clicks for current + previous period in one query
  const { data: clicks, error } = await supabase
    .from("social_link_clicks")
    .select("platform, clicked_at")
    .eq("provider_id", providerId)
    .gte("clicked_at", prevPeriodStartISO)
    .order("clicked_at", { ascending: true });

  if (error || !clicks) {
    return { totalClicks: 0, byPlatform: [], daily: [], changePercent: null };
  }

  // Split into current vs previous period
  let currentCount = 0;
  let prevCount = 0;
  const platformCounts: Record<string, number> = {};
  const dailyCounts: Record<string, number> = {};

  for (const click of clicks) {
    const clickTime = new Date(click.clicked_at).getTime();
    const isCurrentPeriod = clickTime >= periodStart.getTime();

    if (isCurrentPeriod) {
      currentCount++;

      // Platform breakdown
      const p = click.platform;
      platformCounts[p] = (platformCounts[p] || 0) + 1;

      // Daily breakdown
      const dateKey = new Date(click.clicked_at).toISOString().slice(0, 10);
      dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
    } else {
      prevCount++;
    }
  }

  // Build platform array sorted by clicks desc
  const byPlatform = Object.entries(platformCounts)
    .map(([platform, count]) => ({ platform, clicks: count }))
    .sort((a, b) => b.clicks - a.clicks);

  // Build daily array for the full period (fill missing days with 0)
  const daily: { date: string; clicks: number }[] = [];
  for (let d = new Date(periodStart); d <= now; d.setDate(d.getDate() + 1)) {
    const dateKey = d.toISOString().slice(0, 10);
    daily.push({ date: dateKey, clicks: dailyCounts[dateKey] || 0 });
  }

  // Change percent
  let changePercent: number | null = null;
  if (prevCount === 0 && currentCount > 0) {
    changePercent = 100;
  } else if (prevCount > 0) {
    changePercent = Math.round(((currentCount - prevCount) / prevCount) * 100);
  }

  return {
    totalClicks: currentCount,
    byPlatform,
    daily,
    changePercent,
  };
}
