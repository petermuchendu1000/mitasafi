"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Phone, ArrowRight, CheckCircle, Home, Building2, Wrench, Lock, AlertCircle, Loader2, ShieldAlert, FileText, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ProfileUpsert, UserRole, UserRoleInsert, RoleUpgradeWarning } from "@/types/db-helpers";
import { needsRoleUpgradeWarning, getPrimaryRoleByHierarchy } from "@/types/db-helpers";

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

// Local type for signup role selection (uses "provider" shorthand)
// null = basic user (no role needed), "landlord" or "provider" = business role
type SignupRole = "landlord" | "provider" | null;

const roleConfig = {
  landlord: {
    title: "List your property",
    subtitle: "Sign up to reach thousands of verified tenants",
    icon: Building2,
    benefits: [
      "List unlimited properties",
      "Screen tenants easily",
      "Collect rent securely",
    ],
  },
  provider: {
    title: "Grow your business",
    subtitle: "Sign up to connect with property owners",
    icon: Wrench,
    benefits: [
      "Get job requests directly",
      "Build your reputation",
      "Receive secure payments",
    ],
  },
  // Default/basic user config (no role)
  default: {
    title: "Find your perfect home",
    subtitle: "Create an account to save listings and get alerts",
    icon: Home,
    benefits: [
      "Save your favorite listings",
      "Get notified on new matches",
      "Track your inquiries",
    ],
  },
};

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupPageSkeleton />}>
      <SignupPageContent />
    </Suspense>
  );
}

function SignupPageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-brand-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-32 mx-auto mb-8" />
          <div className="h-12 bg-gray-200 rounded mb-4" />
          <div className="h-12 bg-gray-200 rounded mb-4" />
          <div className="h-12 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}

function SignupPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // Only set role if explicitly passed as landlord or provider
  const roleParam = searchParams.get("role");
  const initialRole: SignupRole = roleParam === "landlord" || roleParam === "provider" ? roleParam : null;
  
  // SECURITY: Sanitize redirect URL to prevent open redirect attacks
  const redirectToRaw = searchParams.get("redirectTo") || "/dashboard";
  const redirectTo = sanitizeClientRedirectUrl(redirectToRaw);
  
  const intent = searchParams.get("intent"); // 'list' | 'manage' | null
  
  // Only allow role selection if explicitly requested
  const [selectedRole, setSelectedRole] = useState<SignupRole>(initialRole);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [welcomeBack, setWelcomeBack] = useState(false);
  const [roleUpgradeWarning, setRoleUpgradeWarning] = useState<RoleUpgradeWarning | null>(null);
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

  // Get config based on selected role
  const config = selectedRole ? roleConfig[selectedRole] : roleConfig.default;
  const RoleIcon = config.icon;

  // Handle showWarning=true from auth callback (Google OAuth role upgrade flow)
  useEffect(() => {
    const showWarning = searchParams.get("showWarning") === "true";
    const pendingRoleFromUrl = searchParams.get("role") as SignupRole;
    
    if (showWarning && pendingRoleFromUrl) {
      // Fetch current user and their roles to show the warning
      const checkRolesAndShowWarning = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get existing roles
        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("is_active", true);

        const currentRoles: UserRole[] = rolesData?.map((r: { role: string }) => r.role as UserRole) || [];
        const newRole: UserRole = pendingRoleFromUrl === "provider" ? "service_provider" : pendingRoleFromUrl as UserRole;

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
  const phoneValidation = useMemo(() => validateKenyanPhone(phoneNumber), [phoneNumber]);
  const showError = touched && phoneNumber && !phoneValidation.isValid && phoneValidation.error;

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
      if (selectedRole) {
        document.cookie = `pendingRole=${selectedRole}; path=/; max-age=300; SameSite=Lax`;
      }
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
      const { data, error } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: otp,
        type: "sms",
      });
      
      if (error) {
        setError(error.message);
      } else if (data.user) {
        // Map role to UserRole (null = no role needed)
        const userRole: UserRole | null = selectedRole === "provider" 
          ? "service_provider" 
          : selectedRole;
        
        // Check existing roles from user_roles table
        const { data: existingRolesData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .eq("is_active", true);
        
        const currentRoles: UserRole[] = existingRolesData?.map((r: { role: string }) => r.role as UserRole) || [];
        
        // Check if profile exists
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", data.user.id)
          .single();
        
        if (!existingProfile) {
          // Create profile for new user (no primary_role needed for basic users)
          const profileData: ProfileUpsert = {
            id: data.user.id,
            email: data.user.email || "",
            phone: fullPhone,
            primary_role: userRole || undefined,
          };
          
          await supabase
            .from("profiles")
            .insert(profileData as never);
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
                  .from('service_providers')
                  .select('id')
                  .eq('user_id', data.user.id)
                  .maybeSingle();

                if (!existingProvider) {
                  const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', data.user.id)
                    .single();

                  const providerProfile = {
                    user_id: data.user.id,
                    business_name: (profile as { full_name?: string } | null)?.full_name || 
                                  data.user.user_metadata?.full_name || 
                                  'My Business',
                    status: 'pending',
                  };

                  const { error: providerError } = await supabase
                    .from('service_providers')
                    .insert(providerProfile as never);

                  if (providerError) {
                    console.error('Error creating service provider profile for existing user:', providerError);
                  }
                }
              }
              
              const targetUrl = getIntentBasedRedirect(userRole);
              router.push(targetUrl);
            }
          } else {
            // New user with role request - add it
            await addRoleToUser(data.user.id, userRole);
            
            // Update primary_role on profile
            await supabase
              .from("profiles")
              .update({ primary_role: userRole } as never)
              .eq("id", data.user.id);
            
            // For service providers, create the service_providers business profile
            // This is required before redirecting to provider onboarding
            if (userRole === "service_provider") {
              const providerProfile = {
                user_id: data.user.id,
                business_name: data.user.user_metadata?.full_name || 
                              data.user.user_metadata?.name || 
                              data.user.email?.split('@')[0] || 
                              'My Business',
                phone: data.user.phone || '+254700000000', // Required field
              };

              const { error: providerError } = await supabase
                .from('service_providers')
                .insert(providerProfile as never);

              if (providerError) {
                console.error('Error creating service provider profile during phone signup:', providerError);
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
            router.push(redirectTo !== "/dashboard" ? redirectTo : "/properties");
          }
        }
      }
    } catch (err) {
      setError("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to add a role to user
  const addRoleToUser = async (userId: string, role: UserRole) => {
    const roleInsert: UserRoleInsert = {
      user_id: userId,
      role: role,
      is_active: true,
      is_verified: false,
    };
    
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert(roleInsert as never);
    
    if (roleError) {
      console.error("Role creation error:", roleError);
    }
  };

  // Handle role upgrade confirmation
  const handleConfirmRoleUpgrade = async () => {
    if (!existingUserId || !roleUpgradeWarning) return;
    
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
          .from('service_providers')
          .select('id')
          .eq('user_id', existingUserId)
          .maybeSingle();

        if (!existingProvider) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', existingUserId)
            .single();

          const providerProfile = {
            user_id: existingUserId,
            business_name: (profile as { full_name?: string } | null)?.full_name || 'My Business',
            phone: '+254700000000', // Required field, will be updated in onboarding
          };

          const { error: providerError } = await supabase
            .from('service_providers')
            .insert(providerProfile as never);

          if (providerError) {
            console.error('Error creating service provider profile during role upgrade:', providerError);
          }
        }
      }
      
      // Update primary_role based on hierarchy: Landlord >= Service Provider > Tenant
      const allRoles = [...existingRoles, targetRole];
      const newPrimaryRole = getPrimaryRoleByHierarchy(allRoles);
      
      await supabase
        .from("profiles")
        .update({ primary_role: newPrimaryRole } as never)
        .eq("id", existingUserId);
      
      // Clear cookies
      document.cookie = "pendingRole=; path=/; max-age=0";
      document.cookie = "pendingRedirect=; path=/; max-age=0";
      
      setRoleUpgradeWarning(null);
      
      // Redirect based on intent or to dashboard with newRole banner
      const targetUrl = getIntentBasedRedirect(targetRole);
      // Add newRole param if going to dashboard (for the welcome banner)
      const finalUrl = targetUrl.startsWith("/dashboard") && !targetUrl.includes("?") 
        ? `${targetUrl}?newRole=${targetRole}`
        : targetUrl;
      router.push(finalUrl);
    } catch (err) {
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
    const dashboardUrl = currentPrimaryRole === "landlord" 
      ? "/dashboard/landlord" 
      : currentPrimaryRole === "service_provider"
        ? "/dashboard/provider"
        : "/dashboard";
    
    setTimeout(() => {
      router.push(dashboardUrl);
    }, 2000);
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
          
          {/* Bottom Center Dynamic Trust Message */}
          <div className="flex justify-center mb-8">
            <div className="w-[80%]">
              <div className="p-8 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-white/10 rounded-xl">
                  <RoleIcon className="w-8 h-8 text-brand-400" />
                </div>
                <h2 className="text-2xl font-bold text-white leading-tight">
                  {config.title.split(" ").slice(0, -1).join(" ")}{" "}
                  <span className="text-brand-400">{config.title.split(" ").slice(-1)}</span>
                </h2>
              </div>
              <div className="flex flex-col gap-4">
                {config.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3 text-white">
                    <CheckCircle className="w-5 h-5 text-brand-400 flex-shrink-0" />
                    <span className="font-medium">{benefit}</span>
                  </div>
                ))}
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-gray-100">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Link href="/">
              <Logo variant="full" color="teal" size="md" />
            </Link>
          </div>

          {/* Welcome Back Message */}
          {welcomeBack ? (
            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8 sm:p-10">
              <div className="text-center space-y-6">
                <div className="w-16 h-16 mx-auto bg-success-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-success-600" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    Welcome back!
                  </h1>
                  <p className="text-gray-500">
                    We found your account. Signing you in...
                  </p>
                </div>
                <div className="flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                </div>
              </div>
            </div>
          ) : roleUpgradeWarning ? (
            /* Role Upgrade Warning Modal */
            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8 sm:p-10">
              <div className="space-y-6">
                {/* Header with warning icon */}
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-100 rounded-xl flex-shrink-0">
                    <ShieldAlert className="w-6 h-6 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                      {roleUpgradeWarning.title}
                    </h2>
                    <p className="text-gray-500 mt-1">
                      Welcome back! You're currently signed in as a{" "}
                      <span className="font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                        {roleUpgradeWarning.fromRole === "service_provider" 
                          ? "Service Provider" 
                          : roleUpgradeWarning.fromRole.charAt(0).toUpperCase() + roleUpgradeWarning.fromRole.slice(1)}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Warning message */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-amber-800 font-medium">
                    {roleUpgradeWarning.message}
                  </p>
                </div>

                {/* Requirements list */}
                {roleUpgradeWarning.requirements.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      {roleUpgradeWarning.requirementsLabel}
                    </h3>
                    <ul className="space-y-2">
                      {roleUpgradeWarning.requirements.map((req, index) => (
                        <li key={index} className="flex items-center gap-3 text-gray-600">
                          <div className="w-1.5 h-1.5 bg-brand-500 rounded-full flex-shrink-0" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-col gap-3 pt-2">
                  <button
                    onClick={handleConfirmRoleUpgrade}
                    disabled={isLoading}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl",
                      "bg-brand-600 text-white font-semibold",
                      "hover:bg-brand-700",
                      "focus:outline-none focus:ring-4 focus:ring-brand-500/30",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      "transition-all duration-200"
                    )}
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        {roleUpgradeWarning.confirmButton}
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={handleCancelRoleUpgrade}
                    disabled={isLoading}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl",
                      "bg-gray-100 text-gray-700 font-semibold",
                      "hover:bg-gray-200",
                      "focus:outline-none focus:ring-4 focus:ring-gray-500/20",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      "transition-all duration-200"
                    )}
                  >
                    {roleUpgradeWarning.cancelButton}
                  </button>
                </div>

                {/* Info note */}
                <p className="text-center text-sm text-gray-500">
                  {roleUpgradeWarning.footer}
                </p>
              </div>
            </div>
          ) : (
          /* Form Card */
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8 sm:p-10 space-y-6">
            {/* Header */}
            <div className="text-center lg:text-left space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Create your account
              </h1>
              <p className="text-gray-500">
                {config.subtitle}
              </p>
            </div>

            {/* Role Selector - Only show when user wants landlord/provider role */}
            {selectedRole && (
            <div className="flex gap-2 p-1.5 bg-gray-100 rounded-xl">
              {(["landlord", "provider"] as const).map((role) => {
                const roleKey = role as "landlord" | "provider";
                const Icon = roleConfig[roleKey].icon;
                return (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(roleKey)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-lg text-sm font-semibold transition-all duration-200",
                      selectedRole === role
                        ? "bg-white text-brand-600 shadow-md"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      {role === "landlord" ? "Landlord" : "Service Provider"}
                    </span>
                  </button>
                );
              })}
            </div>
            )}

            {/* Signup Options */}
            <div className="space-y-6">
              {/* Google Sign Up */}
              <button
                onClick={handleGoogleSignup}
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

              {/* Divider */}
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

              {/* Phone Input / OTP Verification */}
              {!otpSent ? (
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
                        maxLength={11}
                        className={cn(
                          "w-full pl-28 pr-12 py-4 rounded-xl",
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
              ) : (
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
                        Create Account
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
              )}
            </div>

            {/* Terms */}
            <p className="text-center text-sm text-gray-500">
              By signing up, you agree to our{" "}
              <Link href="/terms" className="text-brand-600 hover:underline font-medium">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-brand-600 hover:underline font-medium">
                Privacy Policy
              </Link>
            </p>

            {/* Login Link */}
            <p className="text-center text-gray-600">
              Already have an account?{" "}
              <Link
                href={redirectTo !== "/dashboard" ? `/login?redirectTo=${encodeURIComponent(redirectTo)}` : "/login"}
                className="font-semibold text-brand-600 hover:text-brand-700 hover:underline transition-colors"
              >
                Log in
              </Link>
            </p>
          </div>
          )}

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
