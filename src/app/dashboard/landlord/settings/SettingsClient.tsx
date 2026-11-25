"use client";

/**
 * Three sections: who you are, how you are reached, and leaving.
 *
 * The read-only fields are rendered as facts with a reason attached, not as
 * disabled inputs. A greyed-out box invites you to look for the button that
 * un-greys it; a sentence saying why the thing cannot change here does not.
 */

import { useState, useTransition } from "react";
import { BadgeCheck, ShieldAlert, Mail } from "lucide-react";
import {
  NOTIFICATION_KEYS,
  NOTIFICATION_LABELS,
  verificationLabel,
  type NotificationPreferences,
  type ProfileFieldErrors,
} from "@/lib/landlord/settings";
import {
  updateLandlordProfile,
  updateLandlordNotifications,
  requestLandlordAccountDeletion,
} from "./actions";

export interface SettingsProfile {
  fullName: string;
  email: string;
  phone: string;
  role: string;
  isVerified: boolean;
  verificationLevel: string | null;
  memberSince: string | null;
  deletionRequestedAt: string | null;
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** A fact the landlord cannot change here, with the reason it cannot. */
function ReadOnlyFact({
  label,
  value,
  reason,
  icon: Icon,
}: {
  label: string;
  value: string;
  reason: string;
  icon?: typeof Mail;
}) {
  return (
    <div className="py-3 border-t border-gray-100 first:border-t-0 first:pt-0">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-900">
        {Icon && <Icon aria-hidden="true" className="w-4 h-4 text-gray-400" />}
        {value}
      </p>
      <p className="mt-0.5 text-xs text-gray-500">{reason}</p>
    </div>
  );
}

function Toggle({
  id,
  checked,
  onChange,
  label,
  description,
  busy,
}: {
  id: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  description: string;
  busy: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-t border-gray-100 first:border-t-0 first:pt-0">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-gray-800">
          {label}
        </label>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={busy}
        onClick={onChange}
        className={`shrink-0 w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${
          checked ? "bg-teal-600" : "bg-gray-300"
        }`}
      >
        <span
          className={`block w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export function SettingsClient({
  profile,
  preferences: initialPreferences,
}: {
  profile: SettingsProfile;
  preferences: NotificationPreferences;
}) {
  const [fullName, setFullName] = useState(profile.fullName);
  const [phone, setPhone] = useState(profile.phone);
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [savingProfile, startProfile] = useTransition();

  const [prefs, setPrefs] = useState(initialPreferences);
  const [prefError, setPrefError] = useState<string | null>(null);
  const [savingPref, startPref] = useTransition();

  const [deletionAt, setDeletionAt] = useState(profile.deletionRequestedAt);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();

  function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setProfileMsg(null);
    startProfile(async () => {
      const r = await updateLandlordProfile(fullName, phone);
      if (r.success) setProfileMsg("Saved.");
      else {
        setFieldErrors(r.fieldErrors ?? {});
        if (r.error) setProfileMsg(r.error);
      }
    });
  }

  function toggle(key: (typeof NOTIFICATION_KEYS)[number]) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next); // optimistic
    setPrefError(null);
    startPref(async () => {
      const r = await updateLandlordNotifications({ [key]: next[key] });
      if (!r.success) {
        setPrefs(prefs); // put it back rather than lie about what was saved
        setPrefError(r.error ?? "Could not save that preference.");
      }
    });
  }

  function requestDeletion() {
    setDeleteError(null);
    startDelete(async () => {
      const r = await requestLandlordAccountDeletion();
      if (r.success) setDeletionAt(new Date().toISOString());
      else setDeleteError(r.error ?? "Could not submit that request.");
    });
  }

  const input =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500";

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-gray-500">Your account and how we reach you</p>
      </div>

      <Section
        title="Your details"
        description="What tenants and applicants see when you contact them."
      >
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label
              htmlFor="settings-fullName"
              className="block text-sm font-medium text-gray-700"
            >
              Name
            </label>
            <input
              id="settings-fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              aria-invalid={fieldErrors.fullName ? true : undefined}
              aria-describedby={
                fieldErrors.fullName ? "settings-fullName-error" : undefined
              }
              className={input}
            />
            {fieldErrors.fullName && (
              <p
                id="settings-fullName-error"
                role="alert"
                className="mt-1 text-sm text-red-700"
              >
                {fieldErrors.fullName}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="settings-phone"
              className="block text-sm font-medium text-gray-700"
            >
              Contact phone
            </label>
            <input
              id="settings-phone"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0712345678"
              aria-invalid={fieldErrors.phone ? true : undefined}
              aria-describedby={
                fieldErrors.phone
                  ? "settings-phone-error"
                  : "settings-phone-hint"
              }
              className={input}
            />
            {fieldErrors.phone ? (
              <p
                id="settings-phone-error"
                role="alert"
                className="mt-1 text-sm text-red-700"
              >
                {fieldErrors.phone}
              </p>
            ) : (
              /* Said out loud, because a phone field in a settings page looks
                 exactly like the one that would change your login. */
              <p
                id="settings-phone-hint"
                className="mt-1 text-xs text-gray-500"
              >
                How tenants reach you. This is not your sign-in method, so
                changing it will not change how you log in.
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={savingProfile}
              className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium disabled:opacity-60"
            >
              {savingProfile ? "Saving…" : "Save"}
            </button>
            {profileMsg && (
              <p role="status" className="text-sm text-gray-600">
                {profileMsg}
              </p>
            )}
          </div>
        </form>
      </Section>

      <Section title="Account">
        <ReadOnlyFact
          label="Sign-in email"
          value={profile.email || "—"}
          icon={Mail}
          reason="This is how you sign in. To change it, contact support — changing it here would only change the address shown, not the one you log in with."
        />
        <ReadOnlyFact
          label="Account type"
          value={profile.role === "landlord" ? "Landlord" : profile.role}
          reason="Set by the roles on your account rather than chosen here."
        />
        <ReadOnlyFact
          label="Verification"
          value={verificationLabel(profile.verificationLevel)}
          reason="Verification is carried out by MitaSafi and cannot be set from your own account."
        />
        {profile.memberSince && (
          <ReadOnlyFact
            label="Member since"
            value={new Date(profile.memberSince).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            reason="The day this account was created."
          />
        )}
        {profile.isVerified && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-teal-700">
            <BadgeCheck aria-hidden="true" className="w-4 h-4" />
            Your account is verified
          </p>
        )}
      </Section>

      <Section
        title="Notifications"
        description="Each one saves as you switch it."
      >
        {NOTIFICATION_KEYS.map((key) => (
          <Toggle
            key={key}
            id={`pref-${key}`}
            checked={prefs[key]}
            busy={savingPref}
            onChange={() => toggle(key)}
            label={NOTIFICATION_LABELS[key].label}
            description={NOTIFICATION_LABELS[key].description}
          />
        ))}
        {prefError && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {prefError}
          </p>
        )}
      </Section>

      <Section title="Closing your account">
        {deletionAt ? (
          <p className="text-sm text-gray-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            You asked to close this account on{" "}
            {new Date(deletionAt).toLocaleDateString("en-GB")}. Someone will be
            in touch. Your listings, leases and payment records are untouched
            until then.
          </p>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              Your account is attached to buildings, leases, tenants and payment
              history that other people rely on, so nothing is deleted the
              moment you ask. This records the request and a person handles it.
            </p>
            {deleteError && (
              <p role="alert" className="mt-3 text-sm text-red-700">
                {deleteError}
              </p>
            )}
            <button
              type="button"
              onClick={requestDeletion}
              disabled={deleting}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 text-red-700 text-sm font-medium hover:bg-red-50 disabled:opacity-60"
            >
              <ShieldAlert aria-hidden="true" className="w-4 h-4" />
              {deleting ? "Sending…" : "Ask to close my account"}
            </button>
          </>
        )}
      </Section>
    </div>
  );
}
