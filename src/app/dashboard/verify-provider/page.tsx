/**
 * Provider Verification Page
 * 
 * Multi-step verification flow for service providers:
 * Step 1: Phone verification
 * Step 2: Provider type selection (Individual / Business)
 * Step 3: Identity verification (ID upload)
 */

import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PhoneVerificationForm } from "./PhoneVerificationForm";
import { ProviderTypeForm } from "./ProviderTypeForm";
import { IdentityVerificationForm } from "./IdentityVerificationForm";
import { RejectedVerificationView } from "./RejectedVerificationView";

export const metadata: Metadata = {
  title: "Verify Your Account | MitaSafi",
  description: "Complete verification to start receiving jobs on MitaSafi",
};

interface ProfileData {
  id: string;
  phone: string | null;
  verification_level: string | null;
}

interface ProviderData {
  id: string;
  phone: string | null;
  business_type: string | null;
  is_verified: boolean | null;
  is_active: boolean | null;
  account_status: string | null;
}

// Determine current step based on verification state
function getCurrentStep(
  verificationLevel: string,
  providerType: string | null,
  hasIdentityDocs: boolean
): number {
  if (verificationLevel === "none") return 1; // Phone verification
  if (!providerType) return 2; // Provider type selection
  if (!hasIdentityDocs) return 3; // Identity verification
  return 4; // Complete (verified) or pending review
}

export default async function ProviderVerifyPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/login?redirectTo=/dashboard/verify-provider");
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, phone, verification_level")
    .eq("id", user.id)
    .single();

  const profile = profileData as ProfileData | null;

  const { data: providerData } = await supabase
    .from("service_providers")
    .select("id, phone, business_type, is_verified, is_active, account_status")
    .eq("user_id", user.id)
    .single();

  const provider = providerData as ProviderData | null;

  // Check verification state
  let verificationLevel = profile?.verification_level || "none";
  const supabasePhoneVerified = user.phone && user.phone_confirmed_at;
  
  // If Supabase already verified their phone (phone signup), auto-update
  if (supabasePhoneVerified && verificationLevel === "none") {
    await supabase
      .from("profiles")
      .update({ 
        phone: user.phone,
        verification_level: "phone",
        updated_at: new Date().toISOString()
      } as never)
      .eq("id", user.id);

    await supabase
      .from("service_providers")
      .update({ 
        phone: user.phone,
        updated_at: new Date().toISOString()
      } as never)
      .eq("user_id", user.id);

    verificationLevel = "phone";
  }

  // Determine identity docs status.
  // Documents submitted = verification_level "id" or "full", OR is_verified, OR account_status pending.
  // Only truly verified if is_verified === true AND verification_level === "full".
  const isPendingVerification = provider?.account_status === "pending_verification";
  const isRejected = provider?.account_status === "rejected";
  const hasIdentityDocs = !!provider?.is_verified || isPendingVerification;

  // Auto-sync: if provider is verified but profile.verification_level is behind, fix it
  if (hasIdentityDocs && verificationLevel !== "full") {
    const admin = createAdminClient();
    await admin
      .from("profiles")
      .update({
        verification_level: "full",
        is_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    verificationLevel = "full";
  }

  // Calculate current step
  const currentStep = getCurrentStep(
    verificationLevel, 
    provider?.business_type || null,
    hasIdentityDocs
  );

  // If fully verified (admin approved), redirect to dashboard
  if ((currentStep === 4 || verificationLevel === "full") && !isPendingVerification && !isRejected) {
    redirect("/dashboard/provider");
  }

  // Get phone for pre-fill
  const phoneToVerify = user.phone || profile?.phone || provider?.phone || null;

  // Step configuration
  const steps = [
    { number: 1, label: "Phone" },
    { number: 2, label: "Account Type" },
    { number: 3, label: "Identity" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/logo/mitasafi-logo-teal.svg" 
              alt="MitaSafi" 
              className="h-8"
            />
          </div>
          <a
            href="/auth/signout"
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            Sign out
          </a>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-md mx-auto px-4 py-12">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${currentStep > step.number 
                  ? "bg-teal-600 text-white" 
                  : currentStep === step.number
                    ? "bg-teal-600 text-white"
                    : "bg-gray-200 text-gray-500"
                }
              `}>
                {currentStep > step.number ? "✓" : step.number}
              </div>
              {index < steps.length - 1 && (
                <div className={`w-12 h-0.5 mx-2 ${
                  currentStep > step.number ? "bg-teal-600" : "bg-gray-200"
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Phone Verification */}
        {currentStep === 1 && (
          <>
            <h1 className="text-2xl font-semibold text-gray-900 text-center mb-1">
              Verify your phone
            </h1>
            <p className="text-gray-500 text-center mb-8">
              We&apos;ll send a 6-digit code to confirm your number
            </p>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <PhoneVerificationForm 
                initialPhone={phoneToVerify} 
                userId={user.id}
              />
            </div>
          </>
        )}

        {/* Step 2: Provider Type Selection */}
        {currentStep === 2 && (
          <>
            <h1 className="text-2xl font-semibold text-gray-900 text-center mb-1">
              Account type
            </h1>
            <p className="text-gray-500 text-center mb-8">
              Choose the type that best describes you
            </p>
            <ProviderTypeForm 
              userId={user.id}
              providerId={provider?.id || ""}
            />
          </>
        )}

        {/* Step 3: Identity Verification (fresh submission or re-upload after rejection) */}
        {currentStep === 3 && !isRejected && (
          <>
            <h1 className="text-2xl font-semibold text-gray-900 text-center mb-1">
              Verify your identity
            </h1>
            <p className="text-gray-500 text-center mb-8">
              {provider?.business_type === "company" 
                ? "Upload your business registration documents"
                : "Upload your national ID for verification"
              }
            </p>
            <IdentityVerificationForm 
              userId={user.id}
              providerId={provider?.id || ""}
              providerType={provider?.business_type as "individual" | "company"}
            />
          </>
        )}

        {/* Pending Verification — documents submitted, awaiting admin review */}
        {isPendingVerification && !isRejected && currentStep === 4 && (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">
              Verification under review
            </h1>
            <p className="text-gray-500 mb-6">
              Your documents have been submitted and are being reviewed by our team.
              This usually takes less than 24 hours.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <p className="font-medium">What happens next?</p>
              <ul className="mt-2 space-y-1 text-left list-disc list-inside">
                <li>Our team verifies your identity documents</li>
                <li>You&apos;ll receive a notification once approved</li>
                <li>Your profile will then be visible to customers</li>
              </ul>
            </div>
            <a
              href="/dashboard/provider"
              className="inline-block mt-6 px-6 py-2.5 text-sm font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
            >
              Go to Dashboard
            </a>
          </div>
        )}

        {/* Rejected — show reason and allow re-upload */}
        {isRejected && (
          <RejectedVerificationView
            userId={user.id}
            providerId={provider?.id || ""}
            providerType={provider?.business_type as "individual" | "company"}
          />
        )}

        {/* Skip Option — only show during active steps, not pending/rejected */}
        {!isPendingVerification && !isRejected && currentStep <= 3 && (
          <p className="text-center text-sm text-gray-500 mt-6">
            <a href="/dashboard/provider" className="hover:text-gray-700">
              I&apos;ll do this later
            </a>
          </p>
        )}
      </main>
    </div>
  );
}
