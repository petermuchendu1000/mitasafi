/**
 * Search Alert Notification Cron Job
 *
 * 1. Find listings published inside the frequency's window
 * 2. Match them to active, verified search alerts of that frequency
 * 3. Send one digest email per matching alert
 *
 * SCHEDULED BY .github/workflows/search-alerts.yml — NOT by vercel.json.
 *
 * This header used to carry instructions for adding Vercel cron entries, and
 * those entries existed in vercel.json. They never fired: production is served
 * by Fly (verified from response headers on mitasafi.com — server: Fly/...,
 * fly-request-id, via: fly.io, and no x-vercel-id) and Fly does not read
 * vercel.json. The entries have been removed, because two declared schedulers
 * for one endpoint is a latent duplicate-send. Do not add them back; add a
 * `schedule:` entry to the workflow and map it in that workflow's resolver step.
 *
 * KNOWN DEFECT — the window is decoupled from what was last sent.
 *
 * sinceDate below is derived from Date.now(), never from
 * search_alerts.last_notified_at. That column is WRITTEN at line ~200 and read
 * nowhere. Two consequences, both inherent to that design:
 *
 *   - a late or skipped run silently drops every listing published in the gap
 *     between the previous window's end and this one's start. No retry covers
 *     it, because the next run looks back from ITS own now().
 *   - two runs inside one window send the same listings to the same people
 *     twice. A manual workflow_dispatch next to a scheduled run does exactly
 *     this.
 *
 * The scheduler's minutes are offset from :00 to shrink the first hazard
 * (GitHub's scheduler is most delayed on the hour). That reduces it; it does
 * not remove it. Fixing it properly means windowing per alert from
 * last_notified_at, which changes which emails people receive — so it is a
 * separate, authorised change, not a drive-by.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeCronRequest } from "@/lib/security/cron-auth";
import { sendSearchAlertNotification } from "@/lib/email";

export async function GET(request: NextRequest) {
  // Verify authorization. Fails closed: an unconfigured secret denies.
  const auth = authorizeCronRequest(request.headers);
  if (!auth.authorized) {
    console.warn(`[Cron] Denied request: ${auth.reason}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const frequency = searchParams.get("frequency") || "instant";

  if (!["instant", "daily", "weekly"].includes(frequency)) {
    return NextResponse.json({ error: "Invalid frequency" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    // Calculate the time window based on frequency
    const now = new Date();
    let sinceDate: Date;

    switch (frequency) {
      case "instant":
        sinceDate = new Date(now.getTime() - 60 * 60 * 1000); // Last hour
        break;
      case "daily":
        sinceDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
        break;
      case "weekly":
        sinceDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
        break;
      default:
        sinceDate = new Date(now.getTime() - 60 * 60 * 1000);
    }

    // Get new active listings since the time window
    const { data: newListings, error: listingsError } = await supabase
      .from("listings")
      .select(
        "id, title, area, bedrooms, rent_amount, cover_photo, property_type, is_verified, available_now, published_at",
      )
      .eq("status", "active")
      .gte("published_at", sinceDate.toISOString())
      .order("published_at", { ascending: false });

    if (listingsError) {
      console.error("[Cron] Error fetching new listings:", listingsError);
      return NextResponse.json(
        { error: "Failed to fetch listings" },
        { status: 500 },
      );
    }

    if (!newListings || newListings.length === 0) {
      console.log(
        `[Cron] No new listings found since ${sinceDate.toISOString()}`,
      );
      return NextResponse.json({
        success: true,
        message: "No new listings",
        processed: 0,
      });
    }

    console.log(`[Cron] Found ${newListings.length} new listings`);

    // Get active search alerts for this frequency
    const { data: alerts, error: alertsError } = await supabase
      .from("search_alerts")
      .select("*")
      .eq("is_active", true)
      .eq("frequency", frequency)
      .not("verified_at", "is", null); // Only verified alerts

    if (alertsError) {
      console.error("[Cron] Error fetching alerts:", alertsError);
      return NextResponse.json(
        { error: "Failed to fetch alerts" },
        { status: 500 },
      );
    }

    if (!alerts || alerts.length === 0) {
      console.log(`[Cron] No active ${frequency} alerts found`);
      return NextResponse.json({
        success: true,
        message: "No active alerts",
        processed: 0,
      });
    }

    console.log(`[Cron] Processing ${alerts.length} alerts`);

    let emailsSent = 0;
    let alertsProcessed = 0;

    // Process each alert
    for (const alert of alerts) {
      // Match listings to this alert's criteria
      const matchingListings = newListings.filter((listing) => {
        // Area filter
        if (alert.areas && alert.areas.length > 0) {
          if (!alert.areas.includes(listing.area)) return false;
        }

        // Property type filter
        if (alert.property_types && alert.property_types.length > 0) {
          if (!alert.property_types.includes(listing.property_type))
            return false;
        }

        // Bedroom filters
        if (
          alert.bedrooms_min !== null &&
          listing.bedrooms < alert.bedrooms_min
        )
          return false;
        if (
          alert.bedrooms_max !== null &&
          listing.bedrooms > alert.bedrooms_max
        )
          return false;

        // Price filters
        if (alert.price_min !== null && listing.rent_amount < alert.price_min)
          return false;
        if (alert.price_max !== null && listing.rent_amount > alert.price_max)
          return false;

        // Verified only
        if (alert.verified_only && !listing.is_verified) return false;

        // Available now
        if (alert.available_now && !listing.available_now) return false;

        return true;
      });

      if (matchingListings.length === 0) {
        continue;
      }

      alertsProcessed++;

      // Send email notification
      if (alert.notify_email && alert.email) {
        const result = await sendSearchAlertNotification({
          recipientEmail: alert.email,
          recipientName: alert.name,
          alertName: alert.name,
          listings: matchingListings.map((l) => ({
            id: l.id,
            title: l.title,
            area: l.area,
            bedrooms: l.bedrooms,
            rent_amount: l.rent_amount,
            cover_photo: l.cover_photo,
          })),
        });

        if (result.success) {
          emailsSent++;
        }

        // Update last_notified_at and matches_count
        await supabase
          .from("search_alerts")
          .update({
            last_notified_at: now.toISOString(),
            matches_count: (alert.matches_count || 0) + matchingListings.length,
          })
          .eq("id", alert.id);
      }

      // TODO: SMS notifications via Africa's Talking or similar
      // if (alert.notify_sms && alert.phone) { ... }
    }

    console.log(
      `[Cron] Processed ${alertsProcessed} alerts, sent ${emailsSent} emails`,
    );

    return NextResponse.json({
      success: true,
      frequency,
      newListings: newListings.length,
      alertsProcessed,
      emailsSent,
    });
  } catch (error) {
    console.error("[Cron] Search alert cron error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
