// =============================================================================
// API ROUTE: M-Pesa Configuration Health Check
// =============================================================================
// GET /api/payments/mpesa/health
//
// Verifies that M-Pesa Daraja configuration is correct by:
//   1. Validating all env vars are present and well-formed
//   2. Attempting an OAuth2 token acquisition (tests credentials + network)
//   3. Reporting callback URL configuration
//
// Authentication: Requires admin role (service role key or signed-in admin).
// NOTE: In development/sandbox, accessible without auth for convenience.
//
// Response shape: MpesaHealthStatus (see mpesa-config.ts)
//
// Usage:
//   - Deploy check: `curl https://your-app.vercel.app/api/payments/mpesa/health`
//   - CI/CD pipeline validation
//   - Admin dashboard health widget
// =============================================================================

import { NextResponse } from "next/server";
import { checkMpesaHealth } from "@/lib/payments/mpesa-config";

export async function GET(request: Request) {
  try {
    // Security: In production, require the service role key as a bearer token.
    // This prevents unauthenticated users from probing configuration.
    const authHeader = request.headers.get("authorization");
    const isProduction = process.env.NEXT_PUBLIC_APP_ENV === "production";

    if (isProduction) {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!serviceRoleKey || authHeader !== `Bearer ${serviceRoleKey}`) {
        return NextResponse.json(
          { error: "Unauthorized. Provide service role key as Bearer token." },
          { status: 401 }
        );
      }
    }

    const health = await checkMpesaHealth();

    // Determine HTTP status based on health
    const httpStatus = health.configured && health.tokenAcquirable ? 200 : 503;

    return NextResponse.json(health, { status: httpStatus });
  } catch (err) {
    console.error("[M-Pesa Health] Unhandled error:", err);
    return NextResponse.json(
      {
        configured: false,
        error: err instanceof Error ? err.message : "Health check failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
