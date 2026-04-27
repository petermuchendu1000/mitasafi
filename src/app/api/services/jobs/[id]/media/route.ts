// =============================================================================
// MITASAFI: BOOKING MEDIA API (M5)
// =============================================================================
// POST /api/services/jobs/[id]/media — Upload a photo for a booking
// DELETE /api/services/jobs/[id]/media?mediaId=xxx — Delete a photo
//
// Stores files in Supabase Storage bucket `booking-media`.
// Inserts metadata row into `booking_media` table.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Valid media stages
const VALID_STAGES = ["before", "during", "after", "proof", "issue"] as const;
type MediaStage = (typeof VALID_STAGES)[number];

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// =============================================================================
// POST — Upload photo
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;

    // Authenticate
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const stage = formData.get("stage") as string | null;
    const caption = formData.get("caption") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!stage || !VALID_STAGES.includes(stage as MediaStage)) {
      return NextResponse.json(
        { error: `Invalid stage. Must be one of: ${VALID_STAGES.join(", ")}` },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Verify booking exists and user is the provider
    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .select("id, provider_id")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Check caller is the provider for this booking
    if (!booking.provider_id) {
      return NextResponse.json(
        { error: "No provider assigned to this booking" },
        { status: 403 }
      );
    }

    const { data: provider } = await admin
      .from("service_providers")
      .select("id")
      .eq("user_id", user.id)
      .eq("id", booking.provider_id)
      .single();

    if (!provider) {
      return NextResponse.json(
        { error: "Only the assigned provider can upload photos" },
        { status: 403 }
      );
    }

    // Upload file to Supabase Storage
    const fileExt = file.name.split(".").pop() ?? "jpg";
    const fileName = `${bookingId}/${stage}/${Date.now()}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await admin.storage
      .from("booking-media")
      .upload(fileName, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[Media] Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = admin.storage.from("booking-media").getPublicUrl(fileName);

    // Insert metadata row
    const { data: mediaRow, error: insertError } = await admin
      .from("booking_media")
      .insert({
        booking_id: bookingId,
        uploaded_by: user.id,
        uploaded_by_role: "provider",
        media_type: "photo",
        media_url: publicUrl,
        stage,
        caption: caption ?? null,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[Media] Insert error:", insertError);
      // Clean up uploaded file on DB error
      await admin.storage.from("booking-media").remove([fileName]);
      return NextResponse.json(
        { error: "Failed to save photo metadata" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { id: mediaRow.id, url: publicUrl },
      { status: 201 }
    );
  } catch (err) {
    console.error("[Media] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE — Remove photo
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const mediaId = request.nextUrl.searchParams.get("mediaId");

    if (!mediaId) {
      return NextResponse.json(
        { error: "Missing mediaId parameter" },
        { status: 400 }
      );
    }

    // Authenticate
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Fetch the media row to verify ownership
    const { data: media, error: fetchError } = await admin
      .from("booking_media")
      .select("id, booking_id, uploaded_by, media_url")
      .eq("id", mediaId)
      .eq("booking_id", bookingId)
      .single();

    if (fetchError || !media) {
      return NextResponse.json(
        { error: "Photo not found" },
        { status: 404 }
      );
    }

    if (media.uploaded_by !== user.id) {
      return NextResponse.json(
        { error: "You can only delete your own photos" },
        { status: 403 }
      );
    }

    // Delete from storage (extract path from URL)
    const storagePath = extractStoragePath(media.media_url);
    if (storagePath) {
      await admin.storage
        .from("booking-media")
        .remove([storagePath])
        .catch(() => {
          // Non-blocking: file may already be gone
        });
    }

    // Delete metadata row
    const { error: deleteError } = await admin
      .from("booking_media")
      .delete()
      .eq("id", mediaId);

    if (deleteError) {
      console.error("[Media] Delete error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete photo" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Media] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Extract the storage object path from a Supabase public URL.
 * URL format: https://<project>.supabase.co/storage/v1/object/public/booking-media/<path>
 */
function extractStoragePath(url: string): string | null {
  const marker = "/booking-media/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}
