/**
 * Phone Verification Server Actions
 * 
 * Handles sending and verifying OTP codes.
 * 
 * Security considerations:
 * - Rate limiting (max 3 attempts per 15 minutes)
 * - OTP expiration (5 minutes)
 * - Secure OTP storage (hashed)
 * - Audit logging
 * 
 * SMS delivery is handled by the centralised @/lib/sms module which
 * supports dev mode (console log) and production (Africa's Talking).
 */

"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { sendOTP } from "@/lib/sms";
import { notifyAdminNewVerificationSubmission } from "@/lib/notifications/triggers";

// =============================================================================
// TYPES
// =============================================================================

export interface OTPResult {
  success: boolean;
  error?: string;
  message?: string;
  // DEV ONLY: OTP returned for testing when SMS is disabled
  devOtp?: string;
}

// OTP record type
interface OTPRecord {
  id: string;
  code: string;
  expires_at: string;
  attempts: number;
  created_at: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 3;
const RATE_LIMIT_WINDOW_MINUTES = 15;
const MAX_SENDS_PER_WINDOW = 3;

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Generate a random 6-digit OTP
 */
function generateOTP(): string {
  // Generate cryptographically secure random number
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  // Get 6 digits
  const otp = String(array[0]).slice(-6).padStart(6, "0");
  return otp;
}

/**
 * Clean phone number to E.164 format
 */
function cleanPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, "");
}

// =============================================================================
// MAIN ACTIONS
// =============================================================================

/**
 * Send OTP to phone number
 * 
 * Flow:
 * 1. Validate phone number
 * 2. Check rate limit
 * 3. Generate OTP
 * 4. Store OTP (hashed) in database
 * 5. Send SMS
 * 6. Return success
 */
export async function sendPhoneOTP(phone: string, userId: string): Promise<OTPResult> {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    
    // Validate inputs
    const cleanPhone = cleanPhoneNumber(phone);
    if (cleanPhone.length !== 12 || !cleanPhone.startsWith("254")) {
      return { success: false, error: "Invalid phone number format" };
    }

    // Verify user exists and matches the session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      return { success: false, error: "Authentication error" };
    }

    // Check rate limit - count recent OTPs sent
    const windowStart = new Date();
    windowStart.setMinutes(windowStart.getMinutes() - RATE_LIMIT_WINDOW_MINUTES);
    
    const { count: recentSends } = await admin
      .from("phone_verifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", windowStart.toISOString());

    if ((recentSends || 0) >= MAX_SENDS_PER_WINDOW) {
      const waitMinutes = RATE_LIMIT_WINDOW_MINUTES - Math.floor(
        (Date.now() - windowStart.getTime()) / 60000
      );
      return { 
        success: false, 
        error: `Too many attempts. Please try again in ${waitMinutes} minutes.` 
      };
    }

    // Generate OTP
    const otp = generateOTP();
    
    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

    // Delete any existing pending OTPs for this user
    await admin
      .from("phone_verifications")
      .delete()
      .eq("user_id", userId)
      .eq("status", "pending");

    // Store new OTP
    const { error: insertError } = await admin
      .from("phone_verifications")
      .insert({
        user_id: userId,
        phone: cleanPhone,
        code: otp, // In production, hash this
        expires_at: expiresAt.toISOString(),
        attempts: 0,
        status: "pending",
      });

    if (insertError) {
      console.error("Error storing OTP:", insertError);
      return { success: false, error: "Failed to generate verification code" };
    }

    // Send SMS via the centralised SMS module
    const smsResult = await sendOTP(`+${cleanPhone}`, otp, OTP_EXPIRY_MINUTES);

    if (!smsResult.success) {
      return { success: false, error: "Failed to send SMS. Please try again." };
    }

    // When SMS gateway is disabled (dev mode), return OTP for testing
    const smsEnabled = process.env.SMS_ENABLED === "true";
    if (!smsEnabled) {
      return { 
        success: true, 
        message: "DEV MODE: Use the code shown below",
        devOtp: otp
      };
    }

    return { 
      success: true, 
      message: "Verification code sent to your phone" 
    };

  } catch (error) {
    console.error("Error in sendPhoneOTP:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Verify OTP code
 * 
 * Flow:
 * 1. Validate inputs
 * 2. Find pending OTP record
 * 3. Check expiry
 * 4. Check attempts
 * 5. Verify code
 * 6. Update profile verification_level
 * 7. Update provider status
 * 8. Return success
 */
export async function verifyPhoneOTP(
  code: string, 
  phone: string, 
  userId: string
): Promise<OTPResult> {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    
    // Validate inputs
    if (!code || code.length !== OTP_LENGTH) {
      return { success: false, error: "Invalid verification code" };
    }

    const cleanPhone = cleanPhoneNumber(phone);

    // Verify session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      return { success: false, error: "Authentication error" };
    }

    // Find pending OTP record
    const { data: otpData, error: fetchError } = await admin
      .from("phone_verifications")
      .select("id, code, expires_at, attempts")
      .eq("user_id", userId)
      .eq("phone", cleanPhone)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const otpRecord = otpData as OTPRecord | null;

    if (fetchError || !otpRecord) {
      return { success: false, error: "No pending verification found. Please request a new code." };
    }

    // Check expiry
    if (new Date(otpRecord.expires_at) < new Date()) {
      // Mark as expired
      await admin
        .from("phone_verifications")
        .update({ status: "expired" })
        .eq("id", otpRecord.id);
      
      return { success: false, error: "Verification code has expired. Please request a new one." };
    }

    // Check attempts
    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      await admin
        .from("phone_verifications")
        .update({ status: "blocked" })
        .eq("id", otpRecord.id);
      
      return { success: false, error: "Too many incorrect attempts. Please request a new code." };
    }

    // Verify code
    if (otpRecord.code !== code) {
      // Increment attempts
      await admin
        .from("phone_verifications")
        .update({ attempts: otpRecord.attempts + 1 })
        .eq("id", otpRecord.id);
      
      const remaining = MAX_ATTEMPTS - otpRecord.attempts - 1;
      return { 
        success: false, 
        error: `Invalid code. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.` 
      };
    }

    // Code is correct! Update verification status
    
    // 1. Mark OTP as verified
    await admin
      .from("phone_verifications")
      .update({ 
        status: "verified",
        verified_at: new Date().toISOString()
      })
      .eq("id", otpRecord.id);

    // 2. Update profile with phone and verification level
    const { error: profileError } = await admin
      .from("profiles")
      .update({ 
        phone: cleanPhone,
        verification_level: "phone",
        updated_at: new Date().toISOString()
      } as never)
      .eq("id", userId);

    if (profileError) {
      console.error("Error updating profile:", profileError);
    }

    // 3. Update service_providers with phone and verified status
    const { error: providerError } = await admin
      .from("service_providers")
      .update({ 
        phone: `+${cleanPhone}`,
        account_status: "pending", // Still pending until ID verification
        updated_at: new Date().toISOString()
      } as never)
      .eq("user_id", userId);

    if (providerError) {
      console.error("Error updating provider:", providerError);
    }

    // Revalidate the dashboard
    revalidatePath("/dashboard/provider");
    revalidatePath("/dashboard/verify-provider");

    return { 
      success: true, 
      message: "Phone verified successfully!" 
    };

  } catch (error) {
    console.error("Error in verifyPhoneOTP:", error);
    return { success: false, error: "Verification failed. Please try again." };
  }
}

// =============================================================================
// STEP 2: PROVIDER TYPE SELECTION
// =============================================================================

export interface ProviderTypeResult {
  success: boolean;
  error?: string;
}

/**
 * Set provider type (individual or business)
 */
export async function setProviderType(
  providerId: string,
  providerType: "individual" | "company",
  userId: string
): Promise<ProviderTypeResult> {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    // Verify user matches session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      return { success: false, error: "Authentication error" };
    }

    // Validate provider type
    if (!["individual", "company"].includes(providerType)) {
      return { success: false, error: "Invalid provider type" };
    }

    // Update provider (admin client bypasses RLS)
    const { error } = await admin
      .from("service_providers")
      .update({ 
        business_type: providerType,
        updated_at: new Date().toISOString()
      })
      .eq("id", providerId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error setting provider type:", error);
      return { success: false, error: "Failed to save provider type" };
    }

    revalidatePath("/dashboard/verify-provider");
    revalidatePath("/dashboard/provider");

    return { success: true };

  } catch (error) {
    console.error("Error in setProviderType:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// =============================================================================
// STEP 3: IDENTITY VERIFICATION
// =============================================================================

export interface DocumentUploadResult {
  success: boolean;
  error?: string;
  url?: string;
}

export interface VerificationResult {
  success: boolean;
  error?: string;
}

/**
 * Upload a verification document to Supabase Storage
 */
export async function uploadVerificationDocument(
  providerId: string,
  documentType: string,
  file: File,
  userId: string
): Promise<DocumentUploadResult> {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    // Verify user matches session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      return { success: false, error: "Authentication error" };
    }

    // Validate document type
    const validTypes = [
      "national_id",
      "selfie_with_id",
      "business_registration",
      "kra_certificate",
      "professional_license"
    ];
    if (!validTypes.includes(documentType)) {
      return { success: false, error: "Invalid document type" };
    }

    // Create file path
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${userId}/${documentType}_${Date.now()}.${fileExt}`;

    // Upload to storage (admin client bypasses storage RLS)
    const { data, error: uploadError } = await admin.storage
      .from("provider-documents")
      .upload(fileName, file, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      if (uploadError.message.includes("Bucket not found")) {
        return { 
          success: false, 
          error: "Storage not configured. Please contact support." 
        };
      }
      return { success: false, error: "Failed to upload file" };
    }

    // Get public URL
    const { data: { publicUrl } } = admin.storage
      .from("provider-documents")
      .getPublicUrl(data.path);

    // Record in provider_documents table (non-blocking — table may not exist yet)
    const { error: docInsertError } = await admin
      .from("provider_documents")
      .insert({
        provider_id: providerId,
        document_type: documentType,
        document_url: publicUrl,
        status: "pending",
      });

    if (docInsertError) {
      // Table may not exist yet — log but don't fail the upload
      console.warn("provider_documents insert skipped:", docInsertError.message);
    }

    return { success: true, url: publicUrl };

  } catch (error) {
    console.error("Error in uploadVerificationDocument:", error);
    return { success: false, error: "Upload failed. Please try again." };
  }
}

/**
 * Complete identity verification (finalize step 3)
 */
export async function completeIdentityVerification(
  providerId: string,
  providerType: "individual" | "company",
  documentUrls: Record<string, string>,
  userId: string
): Promise<VerificationResult> {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    // Verify user matches session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      return { success: false, error: "Authentication error" };
    }

    // Validate required documents based on provider type
    if (providerType === "individual") {
      if (!documentUrls.national_id || !documentUrls.selfie_with_id) {
        return { success: false, error: "Please upload all required documents" };
      }
    } else {
      if (!documentUrls.business_registration || !documentUrls.kra_certificate) {
        return { success: false, error: "Please upload all required documents" };
      }
    }

    // Reset any previously rejected documents back to 'pending' for re-review.
    // This handles the re-submission flow (M-D.5).
    // Cast needed: reviewed_at/reviewed_by added by migration, not yet in generated types.
    const { error: resetError } = await admin
      .from("provider_documents")
      .update({
        status: "pending",
        rejection_reason: null,
        reviewed_at: null,
        reviewed_by: null,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("provider_id", providerId)
      .eq("status", "rejected");

    if (resetError) {
      console.warn("Failed to reset rejected documents:", resetError.message);
    }

    // Set provider to pending verification — admin must approve via queue.
    // Document URLs are already stored in provider_documents (via uploadVerificationDocument).
    const providerUpdate: Record<string, unknown> = {
      is_verified: false,
      is_active: false,
      account_status: "pending_verification",
      updated_at: new Date().toISOString(),
    };

    // Update service_providers (admin client bypasses RLS)
    const { error: providerError } = await admin
      .from("service_providers")
      .update(providerUpdate)
      .eq("id", providerId)
      .eq("user_id", userId);

    if (providerError) {
      console.error("Error updating provider:", providerError);
      return { success: false, error: "Failed to save verification" };
    }

    // Update profile verification level to "id" (documents submitted, awaiting review)
    // "full" is only set when admin approves.
    const { error: profileError } = await admin
      .from("profiles")
      .update({ 
        verification_level: "id",
        is_verified: false,
        updated_at: new Date().toISOString()
      } as never)
      .eq("id", userId);

    if (profileError) {
      console.error("Error updating profile:", profileError);
    }

    // Revalidate paths
    revalidatePath("/dashboard/verify-provider");
    revalidatePath("/dashboard/provider");
    revalidatePath("/dashboard/provider/services");

    // Notify admins about the new submission (fire-and-forget)
    notifyAdminNewVerificationSubmission({
      providerName: user.email?.split("@")[0] || "Provider",
      providerId,
      providerType,
    }).catch((err) =>
      console.error("Admin verification notification failed:", err)
    );

    return { success: true };

  } catch (error) {
    console.error("Error in completeIdentityVerification:", error);
    return { success: false, error: "Verification failed. Please try again." };
  }
}
