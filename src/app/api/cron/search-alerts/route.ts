/**
 * Search Alert Notification Cron Job
 * 
 * This endpoint is called by a cron job (e.g., Vercel Cron) to:
 * 1. Find new listings since last notification
 * 2. Match them to active search alerts
 * 3. Send email notifications
 * 
 * Schedule: Every hour for "instant" alerts, daily for "daily", weekly for "weekly"
 * 
 * Vercel Cron: Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/search-alerts?frequency=instant",
 *     "schedule": "0 * * * *"
 *   }, {
 *     "path": "/api/cron/search-alerts?frequency=daily",
 *     "schedule": "0 8 * * *"
 *   }, {
 *     "path": "/api/cron/search-alerts?frequency=weekly",
 *     "schedule": "0 8 * * 1"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSearchAlertNotification } from "@/lib/email";

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  // In development, allow without secret
  if (process.env.NODE_ENV === "development") {
    return true;
  }
  
  // If no secret configured, allow (but log warning)
  if (!cronSecret) {
    console.warn("[Cron] CRON_SECRET not configured, allowing request");
    return true;
  }
  
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const frequency = searchParams.get("frequency") || "instant";
  
  if (!["instant", "daily", "weekly"].includes(frequency)) {
    return NextResponse.json(
      { error: "Invalid frequency" },
      { status: 400 }
    );
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
      .select("id, title, area, bedrooms, rent_amount, cover_photo, property_type, is_verified, available_now, published_at")
      .eq("status", "active")
      .gte("published_at", sinceDate.toISOString())
      .order("published_at", { ascending: false });

    if (listingsError) {
      console.error("[Cron] Error fetching new listings:", listingsError);
      return NextResponse.json(
        { error: "Failed to fetch listings" },
        { status: 500 }
      );
    }

    if (!newListings || newListings.length === 0) {
      console.log(`[Cron] No new listings found since ${sinceDate.toISOString()}`);
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
        { status: 500 }
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
      const matchingListings = newListings.filter(listing => {
        // Area filter
        if (alert.areas && alert.areas.length > 0) {
          if (!alert.areas.includes(listing.area)) return false;
        }
        
        // Property type filter
        if (alert.property_types && alert.property_types.length > 0) {
          if (!alert.property_types.includes(listing.property_type)) return false;
        }
        
        // Bedroom filters
        if (alert.bedrooms_min !== null && listing.bedrooms < alert.bedrooms_min) return false;
        if (alert.bedrooms_max !== null && listing.bedrooms > alert.bedrooms_max) return false;
        
        // Price filters
        if (alert.price_min !== null && listing.rent_amount < alert.price_min) return false;
        if (alert.price_max !== null && listing.rent_amount > alert.price_max) return false;
        
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
          listings: matchingListings.map(l => ({
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

    console.log(`[Cron] Processed ${alertsProcessed} alerts, sent ${emailsSent} emails`);

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
      { status: 500 }
    );
  }
}
