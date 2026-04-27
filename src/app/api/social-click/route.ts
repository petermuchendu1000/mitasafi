/**
 * Social Link Click Tracking API
 *
 * Two endpoints for maximum reliability:
 *
 * POST /api/social-click  — fire-and-forget beacon from client onClick
 *   Body: { provider_id, platform, url, session_id }
 *   Returns: 204 No Content
 *
 * GET  /api/social-click   — redirect fallback (for no-JS or shared links)
 *   Query: ?provider_id=...&platform=...&url=...&session_id=...
 *   Returns: 302 → destination URL
 *
 * Deduplication: If a session_id was already recorded within the last 30 seconds,
 * the second write is skipped (covers beacon + redirect firing on same click).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Untyped Supabase admin client for the social_link_clicks table,
 * which is not yet in the generated Database types.
 */
function getUntypedAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Allowed platform keys (prevents junk data)
const VALID_PLATFORMS = new Set([
  "website",
  "facebook",
  "instagram",
  "tiktok",
  "twitter",
  "linkedin",
  "youtube",
]);

/**
 * Validate and sanitise a destination URL.
 * Returns the cleaned URL or null if invalid.
 */
function sanitizeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    // Only allow http(s) destinations
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Record a click in the database.
 * Deduplicates by session_id within a 30-second window.
 */
async function recordClick(params: {
  provider_id: string;
  platform: string;
  destination_url: string;
  session_id: string | null;
  referrer: string | null;
  user_agent: string | null;
}): Promise<void> {
  const admin = getUntypedAdmin();

  // Deduplicate: skip if same session_id recorded in last 30s
  if (params.session_id) {
    const cutoff = new Date(Date.now() - 30_000).toISOString();
    const { data: existing } = await admin
      .from("social_link_clicks")
      .select("id")
      .eq("session_id", params.session_id)
      .gte("clicked_at", cutoff)
      .limit(1);

    if (existing && existing.length > 0) return;
  }

  await admin.from("social_link_clicks").insert({
    provider_id: params.provider_id,
    platform: params.platform,
    destination_url: params.destination_url,
    session_id: params.session_id,
    referrer: params.referrer,
    user_agent: params.user_agent,
  });
}

// ─── POST handler (beacon) ─────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const provider_id = body.provider_id as string;
    const platform = body.platform as string;
    const url = sanitizeUrl(body.url);
    const session_id = (body.session_id as string) || null;

    // Validate required fields
    if (!provider_id || !platform || !url) {
      return new NextResponse(null, { status: 400 });
    }
    if (!VALID_PLATFORMS.has(platform)) {
      return new NextResponse(null, { status: 400 });
    }

    // Record asynchronously — don't block the response
    // Use waitUntil-style: fire the promise but respond immediately
    const referrer = request.headers.get("referer") || null;
    const user_agent = request.headers.get("user-agent") || null;

    // We still await to ensure the write completes before the edge function dies,
    // but the client already fired sendBeacon and moved on.
    await recordClick({
      provider_id,
      platform,
      destination_url: url,
      session_id,
      referrer,
      user_agent,
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    // Never fail loudly — tracking is non-critical
    return new NextResponse(null, { status: 204 });
  }
}

// ─── GET handler (redirect) ────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const provider_id = params.get("provider_id");
  const platform = params.get("platform") || "";
  const rawUrl = params.get("url");
  const session_id = params.get("session_id") || null;

  const url = sanitizeUrl(rawUrl);

  // If URL is invalid, redirect to homepage instead of showing an error
  if (!url) {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  // Only record if we have valid tracking data
  if (provider_id && VALID_PLATFORMS.has(platform)) {
    const referrer = request.headers.get("referer") || null;
    const user_agent = request.headers.get("user-agent") || null;

    // Fire and don't block the redirect
    recordClick({
      provider_id,
      platform,
      destination_url: url,
      session_id,
      referrer,
      user_agent,
    }).catch(() => {
      // Swallow — tracking must never break navigation
    });
  }

  return NextResponse.redirect(url, 302);
}
