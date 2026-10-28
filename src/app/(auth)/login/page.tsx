"use client";

import { useState, useMemo, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Phone, ArrowRight, CheckCircle, Lock, AlertCircle, Loader2, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { usePageLoadPerformance, useComponentPerformance, useMeasureAsync } from "@/lib/performance";

// SECURITY: URL sanitizer for client-side redirect validation
function sanitizeClientRedirectUrl(url: string | null): string {
  const fallback = '/dashboard';
  if (!url) return fallback;
  
  try {
    const decoded = decodeURIComponent(url);
    // Must start with / but not //
    if (!decoded.startsWith('/') || decoded.startsWith('//')) return fallback;
    // No protocols (javascript:, data:, http:, etc.)
    if (decoded.includes(':')) return fallback;
    // No path traversal
    if (decoded.includes('..')) return fallback;
    // Only allow specific paths
    const allowedPaths = ['/dashboard', '/properties', '/listings', '/services', '/saved'];
    if (!allowedPaths.some(p => decoded.startsWith(p))) return fallback;
    return decoded;
  } catch {
    return fallback;
  }
}

// Error codes that /auth/callback redirects here with. Until these were mapped,
// nothing on this page read ?error=, so a failed OAuth sign-in or a failed
// profile write returned the user to a login form that looked perfectly normal.
// The raw code is never rendered - an unrecognised one falls back to the
// generic message rather than echoing whatever was in the URL.
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  auth_failed: "We couldn't complete that sign-in. Please try again.",
  profile_lookup_failed: "We couldn't load your account just now. Please try again.",
  profile_create_failed: "We couldn't finish setting up your account. Please try again.",
  role_create_failed: "Your account was created but we couldn't set up your role. Please try again.",
};

const GENERIC_AUTH_ERROR = "Something went wrong signing you in. Please try again.";

function authErrorMessage(code: string | null): string | null {
  if (!code) return null;
  return AUTH_ERROR_MESSAGES[code] ?? GENERIC_AUTH_ERROR;
}

// Kenya Flag SVG Component
function KenyaFlag({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="16" rx="2" fill="#fff"/>
      <rect width="24" height="4" fill="#000"/>
      <rect y="6" width="24" height="4" fill="#BB0000"/>
      <rect y="12" width="24" height="4" fill="#006600"/>
      <rect y="4" width="24" height="2" fill="#fff"/>
      <rect y="10" width="24" height="2" fill="#fff"/>
      {/* Shield simplified */}
      <ellipse cx="12" cy="8" rx="3" ry="4" fill="#BB0000" stroke="#000" strokeWidth="0.5"/>
      <ellipse cx="12" cy="8" rx="1.5" ry="2.5" fill="#fff"/>
      <rect x="11.5" y="2" width="1" height="12" fill="#000"/>
    </svg>
  );
}

// Phone number validation for Kenya
function validateKenyanPhone(phone: string): { isValid: boolean; error?: string } {
  // Remove spaces and non-numeric characters
  const cleaned = phone.replace(/\D/g, "");
  
  if (!cleaned) {
    return { isValid: false };
  }
  
  if (cleaned.length < 9) {
    return { isValid: false, error: "Phone number is too short" };
  }
  
  if (cleaned.length > 9) {
    return { isValid: false, error: "Phone number is too long" };
  }
  
  // Kenyan mobile numbers start with 7 or 1
  if (!cleaned.startsWith("7") && !cleaned.startsWith("1")) {
    return { isValid: false, error: "Must start with 7 or 1" };
  }
  
  return { isValid: true };
}

// Format phone number for display (XXX XXX XXX)
function formatPhoneNumber(value: string): string {
  const cleaned = value.replace(/\D/g, "").slice(0, 9);
  const parts = [];
  
  if (cleaned.length > 0) parts.push(cleaned.slice(0, 3));
  if (cleaned.length > 3) parts.push(cleaned.slice(3, 6));
  if (cleaned.length > 6) parts.push(cleaned.slice(6, 9));
  
  return parts.join(" ");
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageSkeleton />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-brand-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-32 mx-auto mb-8" />
          <div className="h-12 bg-gray-200 rounded mb-4" />
          <div className="h-12 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // SECURITY: Sanitize redirect URL to prevent open redirect attacks
  const redirectTo = sanitizeClientRedirectUrl(searchParams.get("redirectTo"));
  
  // 🔍 PERFORMANCE: Track component performance
  usePageLoadPerformance()
  useComponentPerformance('LoginPage')
  const measureAsync = useMeasureAsync()
  
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  // Seeded from ?error= so a redirect out of /auth/callback is visible in the
  // existing error block below. Lazy initialiser: it reads the URL once, and
  // the first keystroke clears it like any other error.
  const [error, setError] = useState<string | null>(() =>
    authErrorMessage(searchParams.get("error"))
  );
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [noAccountFound, setNoAccountFound] = useState(false);

  const supabase = createClient();

  // Validate phone number
  const phoneValidation = useMemo(() => validateKenyanPhone(phoneNumber), [phoneNumber]);
  const showError = touched && phoneNumber && !phoneValidation.isValid && phoneValidation.error;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
    setError(null);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await measureAsync('google-oauth', async () => {
        // Replace current history entry with the final destination
        // This way, after OAuth, back button won't return to login page
        if (redirectTo !== "/dashboard") {
          window.history.replaceState({}, "", redirectTo);
        }
        
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
          },
        });
        
        if (error) {
          setError(error.message);
          setIsLoading(false);
        }
      })
      // If no error, user will be redirected to Google
    } catch (err) {
      setError("Failed to connect to Google. Please try again.");
      setIsLoading(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setError(null);
    
    if (!phoneValidation.isValid) {
      return;
    }
    
    setIsLoading(true);
    const cleanedPhone = phoneNumber.replace(/\D/g, "");
    const fullPhone = `+254${cleanedPhone}`;
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
      });
      
      if (error) {
        setError(error.message);
      } else {
        setOtpSent(true);
      }
    } catch (err) {
      setError("Failed to send OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }
    
    setIsLoading(true);
    const cleanedPhone = phoneNumber.replace(/\D/g, "");
    const fullPhone = `+254${cleanedPhone}`;
    
    try {
      await measureAsync('otp-verification', async () => {
        const { data, error } = await supabase.auth.verifyOtp({
          phone: fullPhone,
          token: otp,
          type: "sms",
        });
        
        if (error) {
          setError(error.message);
        } else if (data.user) {
          // Check if user has any active roles
          const { data: rolesData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", data.user.id)
            .eq("is_active", true);
          
          const userRoles = rolesData?.map((r: { role: string }) => r.role) || [];
          
          if (userRoles.length === 0) {
            // Check if profile exists
            const { data: profile } = await supabase
              .from("profiles")
              .select("id")
              .eq("id", data.user.id)
              .single();
            
            if (!profile) {
              // No account exists - show "no account found" message
              // Sign out the user since they don't have an account
              await supabase.auth.signOut();
              setNoAccountFound(true);
              setOtpSent(false);
              setOtp("");
            } else {
              // Account exists but no roles yet - go to signup to select role
              const signupUrl = redirectTo !== "/dashboard" 
                ? `/signup?redirectTo=${encodeURIComponent(redirectTo)}`
                : "/signup";
              router.push(signupUrl);
            }
          } else {
            // Has roles - go to intended destination
            router.push(redirectTo);
          }
        }
      })
    } catch (err) {
      setError("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    setIsLoading(true);
    
    const cleanedPhone = phoneNumber.replace(/\D/g, "");
    const fullPhone = `+254${cleanedPhone}`;
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
      });
      
      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError("Failed to resend OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Image Background (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        {/* Background Image */}
        <Image
          src="https://syoolvgoaqnckgmngvse.supabase.co/storage/v1/object/public/landing-images/hero/modern-apartment-building.jpg"
          alt="Modern apartments in Nairobi"
          fill
          className="object-cover"
          priority
        />
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900/60 to-brand-900/80" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-12 w-full">
          {/* Logo */}
          <Link href="/" className="inline-block">
            <Logo variant="full" color="white" size="md" />
          </Link>
          
          {/* Bottom Center Trust Message */}
          <div className="flex justify-center mb-8">
            <div className="w-[80%]">
              <div className="p-8 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <h2 className="text-3xl font-bold text-white leading-tight mb-6">
                Renting done right,<br />
                <span className="text-brand-400">the MitaSafi way.</span>
              </h2>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 text-white">
                  <CheckCircle className="w-5 h-5 text-brand-400 flex-shrink-0" />
                  <span className="font-medium">Trusted by thousands in Nairobi</span>
                </div>
                <div className="flex items-center gap-3 text-white">
                  <CheckCircle className="w-5 h-5 text-brand-400 flex-shrink-0" />
                  <span className="font-medium">Secure, transparent transactions</span>
                </div>
                <div className="flex items-center gap-3 text-white">
                  <CheckCircle className="w-5 h-5 text-brand-400 flex-shrink-0" />
                  <span className="font-medium">Verified users and listings</span>
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-gray-100">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Link href="/">
              <Logo variant="full" color="teal" size="md" />
            </Link>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8 sm:p-10 space-y-8">
            {/* Header */}
            <div className="text-center lg:text-left space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Welcome back
              </h1>
              <p className="text-gray-500">
                Good to see you again
              </p>
            </div>

            {/* Login Options */}
            <div className="space-y-6">
              {/* Google Sign In */}
              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className={cn(
                  "w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl",
                  "bg-white border-2 border-gray-200 text-gray-700 font-semibold",
                  "hover:border-gray-300 hover:bg-gray-50",
                  "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-all duration-200"
                )}
              >
              {/* Google Icon */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* No Account Found Message */}
            {noAccountFound && (
              <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">No account found</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      We couldn&apos;t find an account with <span className="font-medium">+254 {phoneNumber}</span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href={redirectTo !== "/dashboard" ? `/signup?redirectTo=${encodeURIComponent(redirectTo)}` : "/signup"}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl",
                      "bg-brand-600 text-white font-semibold",
                      "hover:bg-brand-700 transition-colors"
                    )}
                  >
                    <UserPlus className="w-4 h-4" />
                    Create Account
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setNoAccountFound(false);
                      setPhoneNumber("");
                      setTouched(false);
                    }}
                    className={cn(
                      "flex-1 px-4 py-3 rounded-xl",
                      "bg-white border-2 border-gray-200 text-gray-700 font-medium",
                      "hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    )}
                  >
                    Try Different Number
                  </button>
                </div>
              </div>
            )}

            {/* Divider */}
            {!noAccountFound && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-400 font-medium">
                  or continue with phone
                </span>
              </div>
            </div>
            )}

            {/* Phone Input / OTP Verification */}
            {!noAccountFound && !otpSent ? (
              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="phone" className="sr-only">
                    Phone number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none gap-2">
                      <KenyaFlag className="w-6 h-4 rounded-sm shadow-sm" />
                      <span className="text-gray-600 font-semibold">+254</span>
                    </div>
                    <input
                      id="phone"
                      type="tel"
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      onBlur={() => setTouched(true)}
                      placeholder="712 345 678"
                      maxLength={11} // 9 digits + 2 spaces
                      className={cn(
                        "w-full pl-28 pr-4 py-4 rounded-xl",
                        "bg-gray-50 border-2 text-gray-900 font-medium",
                        "placeholder:text-gray-400 placeholder:font-normal",
                        "hover:bg-gray-50/50",
                        "focus:outline-none focus:ring-4 focus:bg-white",
                        "transition-all duration-200",
                        showError
                          ? "border-red-300 hover:border-red-400 focus:border-red-500 focus:ring-red-500/10"
                          : phoneValidation.isValid
                          ? "border-success-300 hover:border-success-400 focus:border-success-500 focus:ring-success-500/10"
                          : "border-gray-200 hover:border-gray-300 focus:border-brand-500 focus:ring-brand-500/10"
                      )}
                    />
                    {/* Validation indicator */}
                    {phoneNumber && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                        {phoneValidation.isValid ? (
                          <CheckCircle className="w-5 h-5 text-success-500" />
                        ) : touched && phoneValidation.error ? (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        ) : null}
                      </div>
                    )}
                  </div>
                  {/* Error message */}
                  {showError && (
                    <p className="text-sm text-red-600 flex items-center gap-1.5 pl-1">
                      <AlertCircle className="w-4 h-4" />
                      {phoneValidation.error}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !phoneValidation.isValid}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl",
                    "bg-cta-600 text-white font-semibold text-lg",
                    "hover:bg-cta-700",
                    "focus:outline-none focus:ring-4 focus:ring-cta-500/30",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "transition-all duration-200"
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Phone className="w-5 h-5" />
                      Send OTP
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            ) : !noAccountFound && otpSent ? (
              /* OTP Verification Form */
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="text-center space-y-2">
                  <p className="text-gray-700 font-medium">
                    Enter the 6-digit code sent to
                  </p>
                  <p className="text-brand-600 font-bold">+254 {phoneNumber}</p>
                </div>
                
                <div className="space-y-2">
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className={cn(
                      "w-full px-4 py-4 rounded-xl text-center text-2xl font-bold tracking-[0.5em]",
                      "bg-gray-50 border-2 text-gray-900",
                      "placeholder:text-gray-300 placeholder:font-normal placeholder:tracking-[0.5em]",
                      "focus:outline-none focus:ring-4 focus:bg-white",
                      "border-gray-200 focus:border-brand-500 focus:ring-brand-500/10",
                      "transition-all duration-200"
                    )}
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || otp.length !== 6}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl",
                    "bg-cta-600 text-white font-semibold text-lg",
                    "hover:bg-cta-700",
                    "focus:outline-none focus:ring-4 focus:ring-cta-500/30",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "transition-all duration-200"
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Verify & Sign In
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
                      setError(null);
                    }}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    ← Change number
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isLoading}
                    className="text-brand-600 font-medium hover:text-brand-700 transition-colors disabled:opacity-50"
                  >
                    Resend code
                  </button>
                </div>
              </form>
            ) : null}
          </div>

          {/* Sign Up Link */}
          <p className="text-center text-gray-600">
            Don&apos;t have an account?{" "}
            <Link
              href={redirectTo !== "/dashboard" ? `/signup?redirectTo=${encodeURIComponent(redirectTo)}` : "/signup"}
              className="font-semibold text-brand-600 hover:text-brand-700 hover:underline transition-colors"
            >
              Sign up
            </Link>
          </p>
          </div>

          {/* Trust Badge - Outside card */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full border border-gray-200 shadow-sm">
              <div className="w-5 h-5 rounded-full bg-success-100 flex items-center justify-center">
                <Lock className="w-3 h-3 text-success-600" />
              </div>
              <span className="text-sm text-gray-600 font-medium">
                Your data is secure and encrypted
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
