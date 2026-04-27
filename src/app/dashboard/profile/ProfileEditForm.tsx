/**
 * ProfileEditForm
 *
 * Client component for editing the customer's profile.
 * Handles: name editing, phone editing, avatar upload.
 *
 * Patterns:
 * - useTransition() for non-blocking server action calls
 * - useRouter().refresh() to re-fetch server data post-mutation
 * - Optimistic UI where practical, error rollback
 * - useToast() for feedback messages
 * - Form validation before submission
 */

"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  Camera,
  Loader2,
  Check,
  Calendar,
} from "lucide-react";
import { useToast } from "@/components/ui";
import {
  updateCustomerProfile,
  uploadCustomerAvatar,
} from "./actions";

// =============================================================================
// TYPES
// =============================================================================

interface ProfileEditFormProps {
  profile: {
    id: string;
    full_name: string | null;
    email: string;
    phone: string | null;
    avatar_url: string | null;
    created_at: string | null;
  };
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ProfileEditForm({ profile }: ProfileEditFormProps) {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [isUploading, setIsUploading] = useState(false);

  // Track if fields have changed
  const hasNameChanged = fullName.trim() !== (profile.full_name ?? "");
  const hasPhoneChanged = phone.trim() !== (profile.phone ?? "");
  const hasChanges = hasNameChanged || hasPhoneChanged;

  // ── Save Profile ──────────────────────────────────────────────────────────

  const handleSave = useCallback(() => {
    if (!hasChanges) return;

    startTransition(async () => {
      const updates: { full_name?: string; phone?: string } = {};
      if (hasNameChanged) updates.full_name = fullName.trim();
      if (hasPhoneChanged) updates.phone = phone.trim();

      const result = await updateCustomerProfile(updates);

      if (!result.success) {
        showError("Save failed", result.error || "Please try again");
      } else {
        showSuccess("Profile updated");
        router.refresh();
      }
    });
  }, [
    fullName,
    phone,
    hasChanges,
    hasNameChanged,
    hasPhoneChanged,
    router,
    showSuccess,
    showError,
  ]);

  // ── Avatar Upload ─────────────────────────────────────────────────────────

  const handleAvatarChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const result = await uploadCustomerAvatar(formData);

        if (!result.success) {
          showError("Upload failed", result.error || "Please try again");
        } else {
          setAvatarUrl(result.avatarUrl ?? null);
          showSuccess("Photo updated");
          router.refresh();
        }
      } catch {
        showError("Upload failed", "An unexpected error occurred");
      } finally {
        setIsUploading(false);
        // Reset file input so same file can be re-selected
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [router, showSuccess, showError]
  );

  // ── Render ────────────────────────────────────────────────────────────────

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-KE", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your personal information
        </p>
      </div>

      {/* Avatar Section */}
      <section className="mb-8">
        <div className="flex items-center gap-6">
          {/* Avatar */}
          <div className="relative group">
            <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile photo"
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <span className="text-brand-700 font-bold text-2xl">
                  {(profile.full_name ?? profile.email)
                    .charAt(0)
                    .toUpperCase()}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              aria-label="Change photo"
            >
              {isUploading ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Camera className="w-5 h-5 text-white" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
              className="hidden"
              aria-label="Upload profile photo"
            />
          </div>

          <div>
            <p className="text-sm font-medium text-gray-900">Profile Photo</p>
            <p className="text-xs text-gray-500 mt-0.5">
              JPG, PNG, or WebP. Max 2MB.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="mt-2 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors disabled:opacity-50"
            >
              {isUploading ? "Uploading..." : "Change photo"}
            </button>
          </div>
        </div>
      </section>

      {/* Form Fields */}
      <section className="space-y-6">
        {/* Full Name */}
        <div>
          <label
            htmlFor="full-name"
            className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5"
          >
            <User className="w-4 h-4 text-gray-400" />
            Full name
          </label>
          <input
            id="full-name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
            maxLength={100}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition-colors"
          />
          {fullName.trim().length > 0 && fullName.trim().length < 2 && (
            <p className="text-xs text-red-500 mt-1">
              Name must be at least 2 characters
            </p>
          )}
        </div>

        {/* Email (read-only) */}
        <div>
          <label
            htmlFor="email"
            className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5"
          >
            <Mail className="w-4 h-4 text-gray-400" />
            Email
          </label>
          <input
            id="email"
            type="email"
            value={profile.email}
            readOnly
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-500 bg-gray-50 cursor-not-allowed"
          />
          <p className="text-xs text-gray-400 mt-1">
            Email cannot be changed. Contact support if needed.
          </p>
        </div>

        {/* Phone */}
        <div>
          <label
            htmlFor="phone"
            className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1.5"
          >
            <Phone className="w-4 h-4 text-gray-400" />
            Phone number
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+254712345678"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 transition-colors"
          />
          <p className="text-xs text-gray-400 mt-1">
            Kenyan format: +254 followed by 9 digits
          </p>
        </div>

        {/* Member Since (read-only info) */}
        {memberSince && (
          <div className="flex items-center gap-2 text-sm text-gray-500 pt-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            Member since {memberSince}
          </div>
        )}
      </section>

      {/* Save Button */}
      <div className="mt-8 flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasChanges || isPending}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Save changes
            </>
          )}
        </button>
        {hasChanges && !isPending && (
          <span className="text-xs text-gray-400">Unsaved changes</span>
        )}
      </div>
    </div>
  );
}
