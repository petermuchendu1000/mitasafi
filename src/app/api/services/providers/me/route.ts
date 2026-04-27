// =============================================================================
// API: GET /api/services/providers/me
// =============================================================================
// Returns the authenticated user's own provider profile with full details.
// Uses cached queries to avoid redundant auth lookups. Returns 401 if not
// authenticated, 404 if the user has no provider record.
// =============================================================================

import { NextResponse } from "next/server";
import { getCachedUser } from "@/lib/cache/queries";
import { getProviderById } from "@/lib/services/providers";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Authenticate
    const { user, error: authError } = await getCachedUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // 2. Look up the provider record for this user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = await createClient() as any;
    const { data: providerRecord, error: lookupError } = await supabase
      .from("service_providers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (lookupError) {
      console.error("[/providers/me] Lookup error:", lookupError);
      return NextResponse.json(
        { error: "Failed to look up provider record" },
        { status: 500 }
      );
    }

    if (!providerRecord) {
      return NextResponse.json(
        { error: "No provider profile found for this user" },
        { status: 404 }
      );
    }

    // 3. Reuse getProviderById for full details (services, availability, etc.)
    const { provider, error: fetchError } = await getProviderById(providerRecord.id);

    if (fetchError || !provider) {
      return NextResponse.json(
        { error: fetchError || "Provider not found" },
        { status: 500 }
      );
    }

    return NextResponse.json({ provider });
  } catch (error) {
    console.error("[/providers/me] Unhandled error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
