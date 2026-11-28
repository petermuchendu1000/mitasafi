"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { readActiveRoles, type RoleQueryClient } from "@/lib/identity/roles";
import {
  usePageLoadPerformance,
  useComponentPerformance,
  useMeasureAsync,
} from "@/lib/performance";
// The open-redirect control, from the one module that owns it. A private
// `sanitizeClientRedirectUrl` used to live here and byte-identically in
// signup/page.tsx, so the shared module was bypassed by the two busiest entry
// points and all three had already diverged. The shared one is strictly
// stronger: it also blocks double-encoding, refuses /api/ and the auth routes,
// filters query parameters, and allows /service-providers and /onboarding.
import { sanitizeRedirectUrl } from "@/lib/security/url-sanitizer";
import { AuthPanel, AuthHeading, AuthLoading } from "../AuthPanel";
import {
  AuthCode,
  AuthError,
  AuthMethods,
  formatPhoneNumber,
  validateKenyanPhone,
} from "../AuthMethods";
import styles from "../auth.module.css";

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthLoading mode="login" />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // SECURITY: Sanitize redirect URL to prevent open redirect attacks
  const redirectTo = sanitizeRedirectUrl(searchParams.get("redirectTo"));

  // 🔍 PERFORMANCE: Track component performance
  usePageLoadPerformance();
  useComponentPerformance("LoginPage");
  const measureAsync = useMeasureAsync();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [codeStatus, setCodeStatus] = useState("");
  const [restorePhoneFocus, setRestorePhoneFocus] = useState(false);
  const [noAccountFound, setNoAccountFound] = useState(false);

  const supabase = createClient();

  // Validate phone number
  const phoneValidation = validateKenyanPhone(phoneNumber);
  const phoneError = touched ? phoneValidation : null;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
    setError(null);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await measureAsync("google-oauth", async () => {
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
      });
      // If no error, user will be redirected to Google
    } catch {
      setError("Failed to connect to Google. Please try again.");
      setIsLoading(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setTouched(true);
    setError(null);

    if (phoneValidation) {
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
    } catch {
      setError("We couldn’t send a code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setCodeStatus("");
    setError(null);

    if (otp.length !== 6) {
      setError("Enter the 6-digit code from your text message.");
      return;
    }

    setIsLoading(true);
    const cleanedPhone = phoneNumber.replace(/\D/g, "");
    const fullPhone = `+254${cleanedPhone}`;

    try {
      await measureAsync("otp-verification", async () => {
        const { data, error } = await supabase.auth.verifyOtp({
          phone: fullPhone,
          token: otp,
          type: "sms",
        });

        if (error) {
          setError(error.message);
        } else if (data.user) {
          // One shared read. A user with no roles is a normal state -- they
          // are browsing and saving listings -- so an empty list is not an
          // error here.
          const { roles } = await readActiveRoles(
            supabase as unknown as RoleQueryClient,
            data.user.id,
          );

          if (roles.length === 0) {
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
              const signupUrl =
                redirectTo !== "/dashboard"
                  ? `/signup?redirectTo=${encodeURIComponent(redirectTo)}`
                  : "/signup";
              router.push(signupUrl);
            }
          } else {
            // Has roles - go to intended destination
            router.push(redirectTo);
          }
        }
      });
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (isLoading) return;
    setCodeStatus("");
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
      } else {
        setOtp("");
        setCodeStatus("We sent a new code.");
      }
    } catch {
      setError("We couldn’t resend the code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const signupHref =
    redirectTo === "/dashboard"
      ? "/signup"
      : `/signup?redirectTo=${encodeURIComponent(redirectTo)}`;
  const changeNumber = () => {
    setRestorePhoneFocus(true);
    setOtpSent(false);
    setOtp("");
    setCodeStatus("");
    setError(null);
  };

  return (
    <AuthPanel mode="login">
      <section
        key={noAccountFound ? "no-account" : otpSent ? "code" : "login"}
        className={styles.screen}
      >
        {noAccountFound ? (
          <>
            <AuthHeading title="No account found">
              Create an account with this number or try another.
            </AuthHeading>
            <div className={styles.form}>
              <Link href={signupHref} className={styles.primary}>
                Create an account
              </Link>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => {
                  setNoAccountFound(false);
                  setPhoneNumber("");
                  setTouched(false);
                  setRestorePhoneFocus(true);
                }}
              >
                Try another number
              </button>
            </div>
          </>
        ) : otpSent ? (
          <>
            <AuthHeading title="Check your phone">
              Enter the 6-digit code sent to <strong>+254 {phoneNumber}</strong>
              .
            </AuthHeading>
            {error && <AuthError id="verification-error">{error}</AuthError>}
            <AuthCode
              code={otp}
              busy={isLoading}
              verifyLabel="Verify and log in"
              status={codeStatus}
              invalid={Boolean(error)}
              onCode={(value) => {
                setOtp(value);
                setError(null);
              }}
              onChangeNumber={changeNumber}
              onResend={handleResendOtp}
              onSubmit={handleVerifyOtp}
            />
          </>
        ) : (
          <>
            <AuthHeading title="Welcome back">
              Log in with Google or a code sent to your phone.
            </AuthHeading>
            {error && <AuthError>{error}</AuthError>}
            <AuthMethods
              phone={phoneNumber}
              phoneError={phoneError}
              busy={isLoading}
              restoreFocus={restorePhoneFocus}
              onGoogle={handleGoogleLogin}
              onChange={handlePhoneChange}
              onBlur={() => phoneNumber && setTouched(true)}
              onSubmit={handlePhoneSubmit}
            />
            <p className={styles.switchPrompt}>
              New to MitaSafi? <Link href={signupHref}>Create an account</Link>
            </p>
          </>
        )}
      </section>
    </AuthPanel>
  );
}
