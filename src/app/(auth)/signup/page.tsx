"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, House, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type {
  UserRole,
  UserRoleInsert,
  RoleUpgradeWarning,
} from "@/types/db-helpers";
import {
  needsRoleUpgradeWarning,
  getPrimaryRoleByHierarchy,
} from "@/types/db-helpers";
import {
  normalizeRoleParam,
  readActiveRoles,
  productRoleNames,
  type RoleQueryClient,
} from "@/lib/identity/roles";
import { buildProviderProfile } from "@/lib/identity/provider-profile";
import { AuthPanel, AuthHeading, AuthLoading } from "../AuthPanel";
import { AuthCode, AuthError, AuthMethods, AuthSpinner, formatPhoneNumber, validateKenyanPhone } from "../AuthMethods";
import styles from "../auth.module.css";

// SECURITY: URL sanitizer for client-side redirect validation
function sanitizeClientRedirectUrl(url: string | null): string {
  const fallback = "/dashboard";
  if (!url) return fallback;

  try {
    const decoded = decodeURIComponent(url);
    // Must start with / but not //
    if (!decoded.startsWith("/") || decoded.startsWith("//")) return fallback;
    // No protocols (javascript:, data:, http:, etc.)
    if (decoded.includes(":")) return fallback;
    // No path traversal
    if (decoded.includes("..")) return fallback;
    // Only allow specific paths
    const allowedPaths = [
      "/dashboard",
      "/properties",
      "/listings",
      "/services",
      "/saved",
    ];
    if (!allowedPaths.some((p) => decoded.startsWith(p))) return fallback;
    return decoded;
  } catch {
    return fallback;
  }
}

// Local type for signup role selection (uses "provider" shorthand)
// null = basic user (no role needed), "landlord" or "provider" = business role
type SignupRole = "landlord" | "provider" | null;

const roleChoices = [
  { value: null, label: "Find a home", icon: House },
  { value: "landlord", label: "Landlord", icon: Building2 },
  { value: "provider", label: "Service provider", icon: Wrench },
] as const;

export default function SignupPage() {
  return (
    <Suspense fallback={<AuthLoading mode="signup" />}>
      <SignupPageContent />
    </Suspense>
  );
}

function SignupPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // Only set role if explicitly passed as landlord or provider
  const roleParam = searchParams.get("role");
  const initialRole: SignupRole =
    roleParam === "landlord" ? "landlord" : roleParam === "provider" || roleParam === "service_provider" ? "provider" : null;

  // SECURITY: Sanitize redirect URL to prevent open redirect attacks
  const redirectToRaw = searchParams.get("redirectTo") || "/dashboard";
  const redirectTo = sanitizeClientRedirectUrl(redirectToRaw);

  const intent = searchParams.get("intent"); // 'list' | 'manage' | null

  // Entry links can preselect a role. Browsing is the default for other visitors.
  const [selectedRole, setSelectedRole] = useState<SignupRole>(initialRole);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [codeStatus, setCodeStatus] = useState("");
  const [restorePhoneFocus, setRestorePhoneFocus] = useState(false);
  const [welcomeBack, setWelcomeBack] = useState(false);
  const [roleUpgradeWarning, setRoleUpgradeWarning] =
    useState<RoleUpgradeWarning | null>(null);
  const [existingUserId, setExistingUserId] = useState<string | null>(null);
  const [existingRoles, setExistingRoles] = useState<UserRole[]>([]);

  const supabase = createClient();

  // Helper function to get redirect URL based on role and intent
  const getIntentBasedRedirect = (role: UserRole | null): string => {
    // If there's a specific redirectTo (like a listing page), use that
    if (redirectTo !== "/dashboard") {
      return redirectTo;
    }
    // Otherwise, use intent-based routing
    if (role === "landlord") {
      if (intent === "list") return "/dashboard/landlord/listings/new";
      if (intent === "manage") return "/dashboard/landlord";
      return "/dashboard/landlord";
    }
    if (role === "service_provider") {
      return "/dashboard/provider";
    }
    // No role = go to browse page (home seekers don't have a dashboard)
    return "/properties";
  };

  // Handle showWarning=true from auth callback (Google OAuth role upgrade flow)
  useEffect(() => {
    const showWarning = searchParams.get("showWarning") === "true";
    const pendingRoleFromUrl = searchParams.get("role") as SignupRole;

    if (showWarning && pendingRoleFromUrl) {
      // Fetch current user and their roles to show the warning
      const checkRolesAndShowWarning = async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Get existing roles
        const { roles: activeRoles } = await readActiveRoles(
          supabase as unknown as RoleQueryClient,
          user.id,
        );
        const currentRoles: UserRole[] = productRoleNames(activeRoles);
        // A fourth copy of the alias lived here, with another `as UserRole`
        // cast on a query parameter. normalizeRoleParam returns null for an
        // unrecognised value, so the warning is simply not shown rather than
        // being computed from a role the type system vouched for and the
        // database would then reject.
        const newRole = normalizeRoleParam(pendingRoleFromUrl);
        if (!newRole) return;

        // Check if warning is needed
        const warning = needsRoleUpgradeWarning(currentRoles, newRole);
        if (warning) {
          setExistingUserId(user.id);
          setExistingRoles(currentRoles);
          setRoleUpgradeWarning(warning);
        } else {
          // No warning needed (shouldn't happen, but handle gracefully)
          router.push(redirectTo);
        }
      };

      checkRolesAndShowWarning();
    }
  }, [searchParams, supabase, router, redirectTo]);

  // Validate phone number
  const phoneValidation = validateKenyanPhone(phoneNumber);
  const phoneError = touched ? phoneValidation : null;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
    setError(null);
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Store selected role in cookie to use after callback (server-side can't access localStorage)
      // Only store if a role is selected (landlord/provider)
      document.cookie = selectedRole
        ? `pendingRole=${selectedRole}; path=/; max-age=300; SameSite=Lax`
        : "pendingRole=; path=/; max-age=0; SameSite=Lax";
      // Store redirect URL in cookie to return user to their original page after signup
      if (redirectTo !== "/dashboard") {
        document.cookie = `pendingRedirect=${encodeURIComponent(redirectTo)}; path=/; max-age=300; SameSite=Lax`;
      }

      // Replace current history entry with the final destination
      // This way, after OAuth, back button won't return to signup page
      if (redirectTo !== "/dashboard") {
        window.history.replaceState({}, "", redirectTo);
      }

      // Build callback URL with redundant params (in case cookies are cleared)
      const callbackUrl = new URL(`${window.location.origin}/auth/callback`);
      if (redirectTo !== "/dashboard") {
        callbackUrl.searchParams.set("redirectTo", redirectTo);
      }
      // Only pass role as URL param if one is selected
      if (selectedRole) {
        callbackUrl.searchParams.set("role", selectedRole);
      }
      // Pass intent for proper redirect after role creation
      if (intent) {
        callbackUrl.searchParams.set("intent", intent);
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
        },
      });

      if (error) {
        setError(error.message);
        setIsLoading(false);
      }
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
      const { data, error } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: otp,
        type: "sms",
      });

      if (error) {
        setError(error.message);
      } else if (data.user) {
        // null = no role needed; this user is browsing and saving listings.
        const userRole: UserRole | null = normalizeRoleParam(selectedRole);

        // Check existing roles from user_roles table
        const { roles: activeRoles } = await readActiveRoles(
          supabase as unknown as RoleQueryClient,
          data.user.id,
        );
        const currentRoles: UserRole[] = productRoleNames(activeRoles);

        // Check if profile exists
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", data.user.id)
          .single();

        if (!existingProfile) {
          // Profile and role in ONE transactional, idempotent call.
          //
          // This was a bare insert whose result was discarded entirely. Every
          // foreign key in the identity graph points at profiles.id -- 39 of
          // them now -- so a silent failure here left a signed-in user that no
          // booking, listing, payment or role row could reference, and the flow
          // carried on to redirect them into a dashboard anyway.
          //
          // The role is passed here too, so a new user's profile and first role
          // are created together or not at all. The role branching below still
          // runs; addRoleToUser is an upsert, so its call is a no-op when
          // provisioning already created the row.
          const { error: provisionError } = await supabase.rpc(
            "provision_identity",
            {
              // undefined, not null: the generated Args type marks the
              // defaulted parameters optional, and omitting a key from the
              // PostgREST body is what makes Postgres apply the SQL default.
              p_email: data.user.email || "",
              p_phone: fullPhone,
              p_full_name: undefined,
              p_avatar_url: undefined,
              p_role: userRole ?? undefined,
            },
          );

          if (provisionError) {
            console.error("Error provisioning identity:", provisionError);
            setError(
              "We could not finish creating your account. Please try again.",
            );
            return;
          }
        }

        // Handle role assignment
        if (userRole) {
          // User wants a specific role (landlord/provider)
          if (currentRoles.includes(userRole)) {
            // Already has this role - welcome back
            setWelcomeBack(true);
            setTimeout(() => {
              router.push(getIntentBasedRedirect(userRole));
            }, 2000);
          } else if (currentRoles.length > 0) {
            // Has other roles - check for upgrade warning
            const warning = needsRoleUpgradeWarning(currentRoles, userRole);
            if (warning) {
              setExistingUserId(data.user.id);
              setExistingRoles(currentRoles);
              setRoleUpgradeWarning(warning);
            } else {
              // Add role without friction
              await addRoleToUser(data.user.id, userRole);

              // For service providers, create the service_providers business profile if it doesn't exist
              if (userRole === "service_provider") {
                const { data: existingProvider } = await supabase
                  .from("service_providers")
                  .select("id")
                  .eq("user_id", data.user.id)
                  .maybeSingle();

                if (!existingProvider) {
                  const { data: profile } = await supabase
                    .from("profiles")
                    .select("full_name")
                    .eq("id", data.user.id)
                    .single();

                  // This payload previously carried a `status` key set to
                  // "pending" and no phone, so it failed on every call for two
                  // independent reasons and the error was only logged. There is
                  // no status column on service_providers; it is account_status.
                  // fullPhone is the number OTP-verified moments ago in this
                  // same handler, so it is the strongest candidate there is.
                  const built = buildProviderProfile({
                    userId: data.user.id,
                    businessName:
                      (profile as { full_name?: string } | null)?.full_name ||
                      data.user.user_metadata?.full_name ||
                      "My Business",
                    phoneCandidates: [fullPhone, data.user.phone],
                  });

                  if (!built.ok) {
                    setError(built.message);
                    return;
                  }

                  const { error: providerError } = await supabase
                    .from("service_providers")
                    .insert(built.record as never);

                  if (providerError) {
                    console.error(
                      "Error creating service provider profile for existing user:",
                      providerError,
                    );
                    setError(
                      "We could not finish setting up your provider profile. Please try again.",
                    );
                    return;
                  }
                }
              }

              const targetUrl = getIntentBasedRedirect(userRole);
              router.push(targetUrl);
            }
          } else {
            // New user with role request - add it
            await addRoleToUser(data.user.id, userRole);

            // primary_role is derived from user_roles by trigger
            // (20260352000000_primary_role_derived.sql), so addRoleToUser above
            // has already set it. The write that used to be here did not even
            // consult the user's existing roles -- it assigned whichever role
            // was just chosen, so signing up as a provider could lower the
            // primary_role of someone who was already a landlord.

            // For service providers, create the service_providers business profile
            // This is required before redirecting to provider onboarding
            if (userRole === "service_provider") {
              const built = buildProviderProfile({
                userId: data.user.id,
                businessName:
                  data.user.user_metadata?.full_name ||
                  data.user.user_metadata?.name ||
                  data.user.email?.split("@")[0] ||
                  "My Business",
                phoneCandidates: [fullPhone, data.user.phone],
              });

              if (!built.ok) {
                setError(built.message);
                return;
              }

              const { error: providerError } = await supabase
                .from("service_providers")
                .insert(built.record as never);

              if (providerError) {
                console.error(
                  "Error creating service provider profile during phone signup:",
                  providerError,
                );
                setError(
                  "We could not finish setting up your provider profile. Please try again.",
                );
                return;
              }
            }

            router.push(getIntentBasedRedirect(userRole));
          }
        } else {
          // No role selected - basic user, just redirect
          if (currentRoles.length > 0) {
            // Existing user with roles
            setWelcomeBack(true);
            setTimeout(() => {
              const primaryRole = getPrimaryRoleByHierarchy(currentRoles);
              router.push(getIntentBasedRedirect(primaryRole));
            }, 2000);
          } else {
            // New basic user - redirect to properties page or original destination
            router.push(
              redirectTo !== "/dashboard" ? redirectTo : "/properties",
            );
          }
        }
      }
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to add a role to user
  // An UPSERT, not an insert. provision_identity may already have created this
  // exact row moments earlier for a new user, and user_roles carries
  // UNIQUE (user_id, role), so a plain insert would fail 23505 on the happy
  // path and log an error that is not one. onConflict makes the whole signup
  // flow safely re-runnable.
  //
  // is_verified stays false and is NOT updated on conflict: role approval is an
  // admin action, and a trigger on user_roles refuses a client that tries to
  // raise it.
  const addRoleToUser = async (userId: string, role: UserRole) => {
    const roleInsert: UserRoleInsert = {
      user_id: userId,
      role: role,
      is_active: true,
      is_verified: false,
    };

    const { error: roleError } = await supabase
      .from("user_roles")
      .upsert(roleInsert as never, {
        onConflict: "user_id,role",
        ignoreDuplicates: true,
      });

    if (roleError) {
      console.error("Role creation error:", roleError);
    }
  };

  // Handle role upgrade confirmation
  const handleConfirmRoleUpgrade = async () => {
    if (!existingUserId || !roleUpgradeWarning || isLoading) return;

    setError(null);
    setIsLoading(true);

    try {
      // Use the target role from the warning object, NOT the selectedRole UI state
      const targetRole: UserRole = roleUpgradeWarning.toRole;

      // Check if role already exists (prevent duplicates)
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", existingUserId)
        .eq("role", targetRole)
        .single();

      if (!existingRole) {
        await addRoleToUser(existingUserId, targetRole);
      }

      // For service providers, create the service_providers business profile if needed
      if (targetRole === "service_provider") {
        const { data: existingProvider } = await supabase
          .from("service_providers")
          .select("id")
          .eq("user_id", existingUserId)
          .maybeSingle();

        if (!existingProvider) {
          // `phone` is selected as well as full_name now. The previous payload
          // passed a hardcoded number UNCONDITIONALLY, with a comment saying it
          // "will be updated in onboarding" -- nothing updates it, and the
          // number is the company's own support line, so the provider was
          // published with Mitasafi's phone as their contact.
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, phone")
            .eq("id", existingUserId)
            .single();

          const storedProfile = profile as {
            full_name?: string | null;
            phone?: string | null;
          } | null;

          // fullPhone is not in scope in this handler. Two candidates: the
          // phone stored on the profile at signup, and the number typed into
          // this page's own form -- which is populated on the phone-OTP path
          // that reaches this modal, and empty on the Google OAuth path.
          const typedPhone = phoneNumber
            ? `+254${phoneNumber.replace(/\D/g, "")}`
            : null;

          const built = buildProviderProfile({
            userId: existingUserId,
            businessName: storedProfile?.full_name || "My Business",
            phoneCandidates: [storedProfile?.phone, typedPhone],
          });

          if (!built.ok) {
            setError(built.message);
            return;
          }

          const { error: providerError } = await supabase
            .from("service_providers")
            .insert(built.record as never);

          if (providerError) {
            console.error(
              "Error creating service provider profile during role upgrade:",
              providerError,
            );
            setError(
              "We could not finish setting up your provider profile. Please try again.",
            );
            return;
          }
        }
      }

      // As above: primary_role follows user_roles by trigger, so adding the
      // role is what updates it. Recomputing the hierarchy here and writing it
      // back was the third of three places doing so.

      // Clear cookies
      document.cookie = "pendingRole=; path=/; max-age=0";
      document.cookie = "pendingRedirect=; path=/; max-age=0";

      setRoleUpgradeWarning(null);

      // Redirect based on intent or to dashboard with newRole banner
      const targetUrl = getIntentBasedRedirect(targetRole);
      // Add newRole param if going to dashboard (for the welcome banner)
      const finalUrl =
        targetUrl.startsWith("/dashboard") && !targetUrl.includes("?")
          ? `${targetUrl}?newRole=${targetRole}`
          : targetUrl;
      router.push(finalUrl);
    } catch {
      setError("Failed to add role. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle role upgrade cancellation
  const handleCancelRoleUpgrade = () => {
    // Clear cookies
    document.cookie = "pendingRole=; path=/; max-age=0";
    document.cookie = "pendingRedirect=; path=/; max-age=0";

    setRoleUpgradeWarning(null);
    setWelcomeBack(true);

    // Redirect to dashboard based on their current/primary role
    const currentPrimaryRole = getPrimaryRoleByHierarchy(existingRoles);
    const dashboardUrl =
      currentPrimaryRole === "landlord"
        ? "/dashboard/landlord"
        : currentPrimaryRole === "service_provider"
          ? "/dashboard/provider"
          : "/dashboard";

    setTimeout(() => {
      router.push(dashboardUrl);
    }, 2000);
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

  const loginHref = redirectTo === "/dashboard" ? "/login" : `/login?redirectTo=${encodeURIComponent(redirectTo)}`;
  const changeNumber = () => {
    setRestorePhoneFocus(true);
    setOtpSent(false);
    setOtp("");
    setCodeStatus("");
    setError(null);
  };

  return (
    <AuthPanel mode="signup">
      <section key={welcomeBack ? "welcome" : roleUpgradeWarning ? "upgrade" : otpSent ? "code" : "signup"} className={styles.screen}>
        {welcomeBack ? (
          <AuthHeading title="Welcome back">
            <span className={styles.status} role="status"><AuthSpinner /> Taking you to your account…</span>
          </AuthHeading>
        ) : roleUpgradeWarning ? (
          <>
            <AuthHeading title={roleUpgradeWarning.title}>{roleUpgradeWarning.message}</AuthHeading>
            {roleUpgradeWarning.requirements.length > 0 && (
              <div className={styles.requirements}>
                <h2>{roleUpgradeWarning.requirementsLabel}</h2>
                <ul>{roleUpgradeWarning.requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul>
              </div>
            )}
            {error && <AuthError>{error}</AuthError>}
            <div className={styles.form}>
              <button type="button" className={styles.primary} onClick={handleConfirmRoleUpgrade} disabled={isLoading}>
                {isLoading && <AuthSpinner />}{roleUpgradeWarning.confirmButton}
              </button>
              <button type="button" className={styles.secondary} onClick={handleCancelRoleUpgrade} disabled={isLoading}>
                {roleUpgradeWarning.cancelButton}
              </button>
            </div>
            <p className={styles.terms}>{roleUpgradeWarning.footer}</p>
          </>
        ) : (
          <>
            {otpSent ? (
              <AuthHeading title="Check your phone">Enter the 6-digit code sent to <strong>+254 {phoneNumber}</strong>.</AuthHeading>
            ) : (
              <>
                <AuthHeading title="Create your account">Sign up with Google or your mobile number.</AuthHeading>
                <fieldset className={styles.rolePicker} disabled={isLoading}>
                  <legend>What brings you here?</legend>
                  <div className={styles.roleChoices}>
                    {roleChoices.map(({ value, label, icon: Icon }) => (
                      <button key={label} type="button" aria-pressed={selectedRole === value} onClick={() => {
                        setSelectedRole(value);
                        setError(null);
                      }}>
                        <Icon size={17} aria-hidden="true" />
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </>
            )}
            {error && <AuthError id={otpSent ? "verification-error" : undefined}>{error}</AuthError>}
            {otpSent ? (
              <AuthCode
                code={otp} busy={isLoading} verifyLabel="Verify and continue" status={codeStatus} invalid={Boolean(error)}
                onCode={(value) => { setOtp(value); setError(null); }}
                onChangeNumber={changeNumber} onResend={handleResendOtp} onSubmit={handleVerifyOtp}
              />
            ) : (
              <AuthMethods
                phone={phoneNumber} phoneError={phoneError} busy={isLoading} restoreFocus={restorePhoneFocus}
                onGoogle={handleGoogleSignup} onChange={handlePhoneChange} onBlur={() => phoneNumber && setTouched(true)} onSubmit={handlePhoneSubmit}
              />
            )}
            <p className={styles.terms}>
              By signing up, you agree to the <Link href="/terms">Terms of Service</Link> and <Link href="/privacy">Privacy Policy</Link>.
            </p>
            {!otpSent && <p className={styles.switchPrompt}>Already have an account? <Link href={loginHref}>Log in</Link></p>}
          </>
        )}
      </section>
    </AuthPanel>
  );
}
