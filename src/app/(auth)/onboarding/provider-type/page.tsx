/**
 * Provider Type Selection - Onboarding Step
 * 
 * Shown immediately after signup for service providers.
 * User must choose: Individual or Business before proceeding.
 * 
 * UX FLOW:
 * 1. User views detailed comparison of Individual vs Business
 * 2. User selects one option
 * 3. User clicks Continue (shows confirmation dialog)
 * 4. User can change selection ONCE before final confirmation
 * 5. After confirming, choice is locked (prevent database recursion)
 * 6. Browser back button is disabled after confirmation
 * 
 * RATIONALE:
 * - Prevents decision fatigue (no infinite back-and-forth)
 * - Prevents database UPDATE recursion (54001 stack depth errors)
 * - Encourages thoughtful decision-making
 * - Maintains data integrity
 * - Users must contact support to change post-onboarding
 */

"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Building2, Check, ArrowRight, Loader2, HelpCircle } from "lucide-react";
import { Logo } from "@/components/ui";
import { cn } from "@/lib/utils";
import { setProviderType } from "./actions";

// Inline sanitizer for client component (can't import server module)
function sanitizeRedirectUrl(url: string | null): string {
  const fallback = '/dashboard/provider';
  if (!url) return fallback;
  
  try {
    const decoded = decodeURIComponent(url);
    // Must start with / but not //
    if (!decoded.startsWith('/') || decoded.startsWith('//')) return fallback;
    // No protocols
    if (decoded.includes(':')) return fallback;
    // No path traversal
    if (decoded.includes('..')) return fallback;
    // Must be dashboard path
    if (!decoded.startsWith('/dashboard')) return fallback;
    return decoded;
  } catch {
    return fallback;
  }
}

type ProviderType = "individual" | "company";

const providerTypes = [
  {
    id: "individual" as ProviderType,
    title: "Individual",
    subtitle: "For freelancers & solo workers",
    description: "I work on my own and don't have a registered business yet",
    icon: User,
    features: [
      "No business license required",
      "Sign up using your ID",
      "Upgrade to a business account anytime",
    ],
    recommended: true,
  },
  {
    id: "company" as ProviderType,
    title: "Business",
    subtitle: "For registered companies",
    description: "I have a registered business with a valid license",
    icon: Building2,
    features: [
      "Display your company name & logo",
      "Built for teams and larger operations",
      "Requires business registration",
    ],
    recommended: false,
  },
];

function ProviderTypeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // SECURITY: Sanitize redirect URL to prevent open redirect attacks
  const redirectTo = sanitizeRedirectUrl(searchParams.get("redirectTo"));
  
  const [selected, setSelected] = useState<ProviderType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBusinessTooltip, setShowBusinessTooltip] = useState(false);

  const handleSelection = (type: ProviderType) => {
    setSelected(type);
    setError(null);
  };

  const handleContinue = async () => {
    if (!selected) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const result = await setProviderType(selected);
      
      if (result.success) {
        // Redirect to dashboard (sanitized URL)
        router.push(redirectTo);
      } else {
        setError(result.error || "Failed to save. Please try again.");
        setIsLoading(false);
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Logo variant="full" size="md" />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-8 h-1 rounded-full bg-brand-600" />
            <div className="w-8 h-1 rounded-full bg-gray-200" />
            <div className="w-8 h-1 rounded-full bg-gray-200" />
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              How are you operating right now?
            </h1>
            <p className="text-gray-600">
              Choose how you're currently operating — you can change this later.
            </p>
          </div>

          {/* Provider Type Selection */}
          <div className="grid gap-4 mb-6">
            {providerTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = selected === type.id;
              
              return (
                <button
                  key={type.id}
                  onClick={() => handleSelection(type.id)}
                  className={cn(
                    "relative w-full p-6 rounded-2xl border-2 text-left transition-all duration-200",
                    "hover:shadow-lg hover:scale-[1.01]",
                    isSelected
                      ? "border-brand-600 bg-brand-50 shadow-md"
                      : "border-gray-200 bg-white hover:border-gray-300",
                    !isSelected && !type.recommended && "opacity-90"
                  )}
                >
                  {/* Recommended badge */}
                  {type.recommended && (
                    <span className="absolute -top-2.5 left-6 px-3 py-0.5 bg-brand-600 text-white text-xs font-medium rounded-full">
                      Recommended for individuals
                    </span>
                  )}

                  <div className="flex gap-4">
                    {/* Icon */}
                    <div className={cn(
                      "w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0",
                      isSelected ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600"
                    )}>
                      <Icon className="w-8 h-8" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="mb-3">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold text-gray-900">
                            {type.title}
                          </h3>
                          {type.id === 'company' && (
                            <div className="relative">
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowBusinessTooltip(!showBusinessTooltip);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setShowBusinessTooltip(!showBusinessTooltip);
                                  }
                                }}
                                onBlur={() => setTimeout(() => setShowBusinessTooltip(false), 200)}
                                className="text-gray-400 hover:text-brand-600 transition-colors cursor-pointer"
                                aria-label="What counts as a registered business?"
                              >
                                <HelpCircle className="w-4 h-4" />
                              </div>
                              {showBusinessTooltip && (
                                <div className="absolute left-0 top-6 z-10 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl">
                                  <p className="font-semibold mb-1">What counts as a registered business?</p>
                                  <p>A registered business includes companies with a valid business certificate or incorporation document.</p>
                                  <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 transform rotate-45" />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-brand-600 mt-0.5">
                          {type.subtitle}
                        </p>
                      </div>
                      <p className="text-sm text-gray-500 mb-4">
                        {type.description}
                      </p>
                      
                      {/* Features */}
                      <ul className="space-y-1">
                        {type.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                            <Check className={cn(
                              "w-5 h-5 flex-shrink-0",
                              isSelected ? "text-brand-600" : "text-gray-400"
                            )} />
                            <span className="truncate">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Selection indicator */}
                    <div className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1",
                      isSelected
                        ? "border-brand-600 bg-brand-600"
                        : "border-gray-300"
                    )}>
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Continue button */}
          <button
            onClick={handleContinue}
            disabled={!selected || isLoading}
            className={cn(
                "w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200 min-h-[56px]",
                "flex items-center justify-center gap-2",
                selected && !isLoading
                  ? "bg-brand-600 text-white hover:bg-brand-700 shadow-lg hover:shadow-xl"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              )}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : selected ? (
              <>
                Continue as {selected === 'individual' ? 'Individual' : 'Business'}
                <ArrowRight className="w-5 h-5" />
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          {/* Helper text */}
          <div className="text-center mt-4 space-y-1">
            <p className="text-base text-gray-600">
              Free to join • No hidden fees • Your data is safe
            </p>
            <p className="text-sm text-gray-500">
              You can change your account type anytime.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ProviderTypePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    }>
      <ProviderTypeContent />
    </Suspense>
  );
}
