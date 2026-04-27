/**
 * Landlord Inquiry Detail API
 * 
 * PATCH /api/landlord/inquiries/[id]
 * 
 * Updates inquiry status and notes.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface UpdateInquiryBody {
  status?: string;
  landlord_notes?: string;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: inquiryId } = await params;
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body: UpdateInquiryBody = await request.json();

    // Validate status if provided
    const validStatuses = ["new", "viewed", "contacted", "viewing_scheduled", "converted", "archived"];
    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // Check that inquiry belongs to landlord
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inquiry, error: fetchError } = await (supabase as any)
      .from("inquiries")
      .select("id, landlord_id")
      .eq("id", inquiryId)
      .single();

    if (fetchError || !inquiry) {
      return NextResponse.json(
        { error: "Inquiry not found" },
        { status: 404 }
      );
    }

    if (inquiry.landlord_id !== user.id) {
      return NextResponse.json(
        { error: "Not authorized to update this inquiry" },
        { status: 403 }
      );
    }

    // Update inquiry
    const updateData: Record<string, unknown> = {};
    if (body.status) updateData.status = body.status;
    if (body.landlord_notes !== undefined) updateData.landlord_notes = body.landlord_notes;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from("inquiries")
      .update(updateData)
      .eq("id", inquiryId);

    if (updateError) {
      console.error("Error updating inquiry:", updateError);
      return NextResponse.json(
        { error: "Failed to update inquiry" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Inquiry updated successfully",
    });
  } catch (error) {
    console.error("Landlord inquiry update API error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
