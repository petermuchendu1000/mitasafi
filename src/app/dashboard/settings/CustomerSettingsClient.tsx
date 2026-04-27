/**
 * Customer Settings Client Component
 *
 * Interactive UI for managing customer notification preferences and account actions.
 * Mirrors the provider SettingsClient pattern:
 * - useTransition() for non-blocking server action calls
 * - Optimistic toggle updates with error rollback
 * - useToast() for feedback messages
 * - useRouter().refresh() for server data re-fetch
 * - Confirmation modal for destructive actions
 */

"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  Lock,
  AlertTriangle,
  ChevronRight,
  Mail,
  MessageSquare,
  Smartphone,
  Loader2,
  Trash2,
} from "lucide-react";
import { useToast } from "@/components/ui";
import {
  updateCustomerNotificationPreferences,
  requestAccountDeletion,
  type NotificationPreferences,
} from "./actions";

// =============================================================================
// TYPES
// =============================================================================

interface CustomerSettingsClientProps {
  initialPreferences: NotificationPreferences;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function CustomerSettingsClient({
  initialPreferences,
}: CustomerSettingsClientProps) {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();
  const [preferences, setPreferences] = useState(initialPreferences);
  const [isPending, startTransition] = useTransition();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Toggle a notification preference ──────────────────────────────────────

  const handleToggle = useCallback(
    (key: keyof NotificationPreferences) => {
      const previousValue = preferences[key];
      const newValue = !previousValue;

      // Optimistic update
      setPreferences((prev) => ({ ...prev, [key]: newValue }));

      startTransition(async () => {
        const result = await updateCustomerNotificationPreferences({
          [key]: newValue,
        });

        if (!result.success) {
          // Rollback
          setPreferences((prev) => ({ ...prev, [key]: previousValue }));
          showError("Failed to save", result.error || "Please try again");
        } else {
          showSuccess("Preference saved");
        }
      });
    },
    [preferences, showSuccess, showError]
  );

  // ── Request Account Deletion ──────────────────────────────────────────────

  const handleDeleteRequest = useCallback(async () => {
    if (confirmText !== "DELETE") return;

    setIsDeleting(true);
    try {
      const result = await requestAccountDeletion();

      if (!result.success) {
        showError("Request failed", result.error || "Please try again");
      } else {
        showSuccess(
          "Deletion requested",
          "Our team will process your request within 48 hours"
        );
        setShowDeleteModal(false);
        setConfirmText("");
        router.refresh();
      }
    } finally {
      setIsDeleting(false);
    }
  }, [confirmText, router, showSuccess, showError]);

  const closeDeleteModal = useCallback(() => {
    setShowDeleteModal(false);
    setConfirmText("");
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your preferences and account
        </p>
      </div>

      {/* ── Notifications Section ────────────────────────────────────────── */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-brand-600" />
          <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          <NotificationToggle
            icon={Mail}
            label="Email notifications"
            description="Booking updates, confirmations, and provider messages"
            checked={preferences.email_notifications}
            onToggle={() => handleToggle("email_notifications")}
            disabled={isPending}
          />
          <NotificationToggle
            icon={MessageSquare}
            label="SMS notifications"
            description="Urgent booking alerts and reminders via SMS"
            checked={preferences.sms_notifications}
            onToggle={() => handleToggle("sms_notifications")}
            disabled={isPending}
          />
          <NotificationToggle
            icon={Smartphone}
            label="Push notifications"
            description="Real-time browser notifications"
            checked={preferences.push_notifications}
            disabled
            disabledReason="Coming soon"
          />
        </div>
      </section>

      {/* ── Security Section ─────────────────────────────────────────────── */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-brand-600" />
          <h2 className="text-lg font-semibold text-gray-900">Security</h2>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          <Link
            href="/auth/reset-password"
            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">
                Change password
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Update your account password
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
        </div>
      </section>

      {/* ── Danger Zone ──────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-semibold text-gray-900">Danger Zone</h2>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900">
                Delete account
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Request permanent deletion of your account and all associated
                data. This action cannot be undone.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3 px-1">
          Need help? Contact{" "}
          <a
            href="mailto:support@mitasafi.co.ke"
            className="text-brand-600 hover:underline"
          >
            support@mitasafi.co.ke
          </a>
        </p>
      </section>

      {/* ── Deletion Confirmation Modal ──────────────────────────────────── */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDeleteModal();
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-title"
        >
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3
                id="delete-title"
                className="text-lg font-semibold text-gray-900"
              >
                Delete your account?
              </h3>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-sm text-gray-600">
                This will permanently remove:
              </p>
              <ul className="text-sm text-gray-600 space-y-1.5 ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span>
                  Your profile and personal information
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span>
                  All booking history and messages
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span>
                  Saved providers and preferences
                </li>
              </ul>
              <p className="text-sm text-gray-600">
                Our team will process the deletion within 48 hours.
                This cannot be reversed.
              </p>
            </div>

            <div className="mb-4">
              <label
                htmlFor="delete-confirm"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Type{" "}
                <span className="font-mono text-red-600">DELETE</span> to
                confirm
              </label>
              <input
                id="delete-confirm"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteRequest}
                disabled={confirmText !== "DELETE" || isDeleting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeleting && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Request Deletion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// NOTIFICATION TOGGLE SUBCOMPONENT
// =============================================================================

interface NotificationToggleProps {
  icon: React.ElementType;
  label: string;
  description: string;
  checked: boolean;
  onToggle?: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

function NotificationToggle({
  icon: Icon,
  label,
  description,
  checked,
  onToggle,
  disabled = false,
  disabledReason,
}: NotificationToggleProps) {
  const toggleId = `toggle-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 text-gray-400 mt-0.5" />
        <div>
          <label
            htmlFor={toggleId}
            className="text-sm font-medium text-gray-900 cursor-pointer"
          >
            {label}
          </label>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {disabledReason && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
            {disabledReason}
          </span>
        )}
        <button
          id={toggleId}
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          onClick={onToggle}
          disabled={disabled}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            focus:outline-none focus:ring-4 focus:ring-brand-100
            ${checked ? "bg-brand-600" : "bg-gray-200"}
            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          `}
        >
          <span
            className={`
              inline-block h-5 w-5 rounded-full bg-white border border-gray-300
              shadow-sm transition-transform
              ${checked ? "translate-x-5" : "translate-x-0.5"}
            `}
          />
        </button>
      </div>
    </div>
  );
}
