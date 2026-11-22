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
 * WINDOWING: per alert, from its own watermark.
 *
 * This handler used to derive one window for everybody from Date.now() — 1h,
 * 24h or 7d — and never read search_alerts.last_notified_at, which it wrote
 * and nothing consumed. A late or skipped run therefore dropped every listing
 * published in the gap, and two runs inside one window sent the same listings
 * twice. Both silent.
 *
 * last_notified_at is now a HIGH-WATER MARK over listings.published_at. Each
 * alert is owed everything published strictly after its own mark; the mark
 * advances only across what was actually sent. A missed run costs latency, not
 * listings, and a repeated run is a no-op. The arithmetic lives in
 * src/lib/search-alerts/window.ts so it can be tested at its boundaries.
 *
 * The failed-send bug this depended on: the watermark update used to run
 * whether or not the email was delivered. That was cosmetic while nothing read
 * the column; as a watermark it would have made a transient Resend failure
 * skip those listings permanently. It now advances only on success.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeCronRequest } from "@/lib/security/cron-auth";
import { sendSearchAlertNotification } from "@/lib/email";
import {
  alertWindowStart,
  globalFetchSince,
  selectDigest,
  MAX_LISTINGS_PER_DIGEST,
  type AlertFrequency,
} from "@/lib/search-alerts/window";

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
    const now = new Date();
    const freq = frequency as AlertFrequency;

    // ALERTS FIRST. The listing window is now derived from the alerts'
    // watermarks, so they have to be known before the listings query can be
    // bounded. The old code fetched listings first because one window served
    // everybody; it no longer does.
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

    // One query for everybody: the earliest watermark among the alerts, floored
    // by MAX_CATCHUP_MS so a dormant alert cannot pull the whole catalogue.
    // Each alert is then filtered to its OWN window in memory.
    const sinceDate = globalFetchSince(alerts, freq, now);

    const { data: newListings, error: listingsError } = await supabase
      .from("listings")
      .select(
        "id, title, area, bedrooms, rent_amount, cover_photo, property_type, is_verified, available_now, published_at",
      )
      .eq("status", "active")
      .gt("published_at", sinceDate.toISOString())
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

    console.log(
      `[Cron] Found ${newListings.length} listings since ${sinceDate.toISOString()}; processing ${alerts.length} alerts`,
    );

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

      // An alert that wants no email is skipped WITHOUT advancing its
      // watermark. Advancing it would quietly consume listings the subscriber
      // never saw, so that turning notify_email back on would start from a
      // mark covering mail that was never sent. The watermark stays put and
      // MAX_CATCHUP_MS keeps the query bounded.
      if (!alert.notify_email || !alert.email) {
        continue;
      }

      // The alert's OWN window, then the size cap. selectDigest returns the
      // watermark that covers exactly what it chose — not now() — so a capped
      // batch drains across later runs instead of being skipped.
      const digest = selectDigest(
        matchingListings,
        alertWindowStart(alert, freq, now),
      );

      if (digest.listings.length === 0) {
        continue;
      }

      alertsProcessed++;
      if (digest.deferred > 0) {
        console.log(
          `[Cron] Alert ${alert.id}: sending ${digest.listings.length} of ${
            digest.listings.length + digest.deferred
          } (cap ${MAX_LISTINGS_PER_DIGEST}); ${digest.deferred} deferred to the next run`,
        );
      }

      const result = await sendSearchAlertNotification({
        recipientEmail: alert.email,
        recipientName: alert.name,
        alertName: alert.name,
        listings: digest.listings.map((l) => ({
          id: l.id,
          title: l.title,
          area: l.area,
          bedrooms: l.bedrooms,
          rent_amount: l.rent_amount,
          cover_photo: l.cover_photo,
        })),
      });

      // THE WATERMARK ADVANCES ONLY ON A DELIVERED EMAIL.
      //
      // This used to run unconditionally. While nothing read last_notified_at
      // that was merely untidy; now it is the record of what the subscriber
      // has actually been told, so advancing it after a failed send would make
      // a transient Resend outage skip those listings forever. On failure the
      // mark stays where it was and the next run retries the same listings.
      if (!result.success) {
        console.error(
          `[Cron] Alert ${alert.id}: send failed, watermark NOT advanced: ${result.error ?? "unknown error"}`,
        );
        continue;
      }

      emailsSent++;

      const { error: markError } = await supabase
        .from("search_alerts")
        .update({
          last_notified_at: digest.nextWatermark,
          matches_count: (alert.matches_count || 0) + digest.listings.length,
        })
        .eq("id", alert.id);

      // A failed update after a delivered email means the next run will send
      // the same digest again. That is the safe direction — a duplicate is
      // visible and annoying, a silent skip is neither — but it must be loud.
      if (markError) {
        console.error(
          `[Cron] Alert ${alert.id}: email sent but watermark update FAILED (${markError.message}). This digest will repeat on the next run.`,
        );
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
