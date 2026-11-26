"use client";

/**
 * The settings shell and its tabs.
 *
 * Read-only facts are rendered as facts with the reason attached, never as
 * disabled inputs: a greyed box invites you to hunt for the control that
 * un-greys it, a sentence does not.
 */

import { useMemo, useState, useTransition } from "react";
import { BadgeCheck, ShieldAlert, Mail } from "lucide-react";
import {
  GENERAL_TOGGLES,
  LANDLORD_NOTIFICATIONS,
  TENANT_NOTIFICATIONS,
  NOTIFICATIONS_NOT_YET_SENT,
  LATE_FEE_TYPES,
  FEE_PAYERS,
} from "@/lib/landlord/settings-schema";
import {
  NOTIFICATION_KEYS,
  NOTIFICATION_LABELS,
  verificationLabel,
  type NotificationPreferences,
  type ProfileFieldErrors,
} from "@/lib/landlord/settings";
import { Card, Switch, NumberField, Radio, SaveBar, NotEnabled } from "./parts";
import { LateFeesTab, type LateFeeRule } from "./LateFeesTab";
import { HelpSidebar } from "./HelpSidebar";
import { BankTab } from "./BankTab";
import type { PayoutDestination } from "@/lib/landlord/payment-instructions";
import {
  updateLandlordProfile,
  updateLandlordNotifications,
  requestLandlordAccountDeletion,
  saveLandlordSettings,
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

type Settings = Record<string, unknown>;

const TABS = [
  "General",
  "Caretakers",
  "Late fee",
  "Notifications",
  "Billing",
  "Bank",
  "Integrations",
] as const;
type Tab = (typeof TABS)[number];

/** Server defaults, mirrored so the UI renders before a row exists. */
/**
 * The server defaults, mirrored EXACTLY so the page shows what is stored
 * before a row exists. Generated from the column defaults rather than typed:
 * the hand-written version omitted every notify_* field, so a landlord with
 * no settings row saw their notifications switched off while the database
 * had them on. An end-to-end run caught it.
 */
const FALLBACK: Settings = {
  tenant_maintenance_access: true,
  application_screening: true,
  accept_partial_payment: true,
  accept_future_payments: true,
  enable_chat: true,
  require_renters_insurance: false,
  enable_staff_access: false,
  late_fee_enabled: false,
  late_fee_type: "percentage",
  late_fee_percentage: 10,
  grace_period_days: 5,
  late_fee_applies_to: "all_line_items",
  mpesa_fee_payer: "tenant",
  card_fee_payer: "tenant",
  notify_all_tenants_signed: true,
  notify_any_tenant_signs: false,
  notify_lease_expiring: true,
  lease_expiry_notice_days: 90,
  notify_payment_made: true,
  notify_payment_failed: true,
  notify_payment_resubmitted: true,
  notify_overdue_summary: true,
  overdue_summary_day_1: 5,
  overdue_summary_day_2: 10,
  notify_refund_debited: true,
  notify_refund_received: true,
  notify_funds_disbursed: true,
  notify_maintenance_submitted: true,
  notify_maintenance_resolved: true,
  notify_maintenance_reopened: true,
  notify_maintenance_updated: false,
  notify_maintenance_comment: false,
  notify_application_submitted: true,
  notify_insurance_provided_requested: true,
  notify_insurance_provided_unrequested: false,
  marketing_sms_opt_in: false,
  tenant_notify_invoice_due_day: true,
  tenant_notify_invoice_late: true,
  tenant_notify_invoice_due_soon: true,
  tenant_invoice_due_notice_days: 5,
  tenant_notify_lease_expiring: true,
  tenant_lease_expiry_notice_days: 90,
  late_fee_amount: null,
};

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

export function SettingsClient({
  profile,
  channels,
  settings: initialSettings,
  lateFeeRules,
  buildings,
  payoutDestinations,
  sampleUnit,
  settingsMissing,
}: {
  profile: SettingsProfile;
  channels: NotificationPreferences;
  settings: Settings | null;
  lateFeeRules: LateFeeRule[];
  buildings: { id: string; name: string }[];
  payoutDestinations: PayoutDestination[];
  sampleUnit: string | null;
  settingsMissing: boolean;
}) {
  const [tab, setTab] = useState<Tab>("General");

  const initial = useMemo(
    () => ({ ...FALLBACK, ...(initialSettings ?? {}) }),
    [initialSettings],
  );
  const [s, setS] = useState<Settings>(initial);
  const [saved, setSaved] = useState<Settings>(initial);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);
  const [savingSettings, startSettings] = useTransition();

  const dirtyKeys = useMemo(
    () => Object.keys(s).filter((k) => s[k] !== saved[k]),
    [s, saved],
  );

  function set(key: string, value: unknown) {
    setSettingsMsg(null);
    setS((prev) => ({ ...prev, [key]: value }));
  }

  function saveSettings() {
    setSettingsMsg(null);
    const patch: Record<string, unknown> = {};
    for (const k of dirtyKeys) patch[k] = s[k];
    startSettings(async () => {
      const r = await saveLandlordSettings(patch);
      if (r.success) {
        setSaved({ ...s });
        setSettingsMsg("Saved.");
      } else {
        setSettingsMsg(r.error ?? "Could not save that.");
      }
    });
  }

  const bool = (k: string) => Boolean(s[k]);
  const num = (k: string) => Number(s[k] ?? 0);
  const str = (k: string) => String(s[k] ?? "");

  const [fullName, setFullName] = useState(profile.fullName);
  const [phone, setPhone] = useState(profile.phone);
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [savingProfile, startProfile] = useTransition();

  const [prefs, setPrefs] = useState(channels);
  const [prefError, setPrefError] = useState<string | null>(null);
  const [, startPref] = useTransition();

  const [deletionAt, setDeletionAt] = useState(profile.deletionRequestedAt);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();

  const input =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500";

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

  function toggleChannel(key: (typeof NOTIFICATION_KEYS)[number]) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setPrefError(null);
    startPref(async () => {
      const r = await updateLandlordNotifications({ [key]: next[key] });
      if (!r.success) {
        setPrefs(prefs);
        setPrefError(r.error ?? "Could not save that.");
      }
    });
  }

  const settingsBar = (
    <SaveBar
      dirty={dirtyKeys.length > 0}
      saving={savingSettings}
      message={settingsMsg}
      onSave={saveSettings}
    />
  );

  function NotifyGroupCard({
    title,
    description,
    items,
  }: {
    title: string;
    description?: string;
    items: (typeof LANDLORD_NOTIFICATIONS)[number]["items"];
  }) {
    return (
      <Card title={title} description={description}>
        {items.map((n) => (
          <div key={n.key}>
            <Switch
              id={`n-${n.key}`}
              checked={bool(n.key)}
              onChange={(v) => set(n.key, v)}
              label={n.label}
            />
            {n.numberKey && bool(n.key) && (
              <div className="pb-3 -mt-1 flex flex-wrap items-center gap-3">
                <NumberField
                  id={`n-${n.numberKey}`}
                  label={`${n.label}: how many`}
                  value={num(n.numberKey)}
                  onChange={(v) => set(n.numberKey as string, v)}
                  suffix={n.numberSuffix}
                  min={n.min}
                  max={n.max}
                />
                {/* The overdue summary goes out TWICE a month in Innago — on
                    the 5th and the 10th. The second day was stored and had no
                    control, so it could never be changed. */}
                {n.numberKey === "overdue_summary_day_1" && (
                  <NumberField
                    id="n-overdue_summary_day_2"
                    label="Second summary day of the month"
                    value={num("overdue_summary_day_2")}
                    onChange={(v) => set("overdue_summary_day_2", v)}
                    suffix="of the month"
                    min={1}
                    max={28}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-gray-500">
          Your account, your people, and how MitaSafi behaves
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <nav aria-label="Settings sections" className="lg:w-56 shrink-0">
          <ul className="flex lg:flex-col gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <li key={t}>
                <button
                  type="button"
                  onClick={() => setTab(t)}
                  aria-current={tab === t ? "page" : undefined}
                  className={`w-full text-left whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    tab === t
                      ? "bg-teal-50 text-teal-800 border border-teal-200"
                      : "text-gray-700 hover:bg-gray-100 border border-transparent"
                  }`}
                >
                  {t}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex-1 min-w-0 space-y-6">
          {tab === "General" && (
            <>
              <Card
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
                      className={input}
                    />
                    {fieldErrors.fullName && (
                      <p role="alert" className="mt-1 text-sm text-red-700">
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
                      aria-describedby="settings-phone-hint"
                      className={input}
                    />
                    {fieldErrors.phone ? (
                      <p role="alert" className="mt-1 text-sm text-red-700">
                        {fieldErrors.phone}
                      </p>
                    ) : (
                      <p
                        id="settings-phone-hint"
                        className="mt-1 text-xs text-gray-500"
                      >
                        How tenants reach you. This is not your sign-in method,
                        so changing it will not change how you log in.
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
              </Card>

              <Card title="Account">
                <ReadOnlyFact
                  label="Sign-in email"
                  value={profile.email || "—"}
                  icon={Mail}
                  reason="This is how you sign in. To change it, contact support — changing it here would only change the address shown, not the one you log in with."
                />
                <ReadOnlyFact
                  label="Account type"
                  value={
                    profile.role === "landlord" ? "Landlord" : profile.role
                  }
                  reason="Set by the roles on your account rather than chosen here."
                />
                <ReadOnlyFact
                  label="Verification"
                  value={verificationLabel(profile.verificationLevel)}
                  reason="Carried out by MitaSafi and cannot be set from your own account."
                />
                {profile.memberSince && (
                  <ReadOnlyFact
                    label="Member since"
                    value={new Date(profile.memberSince).toLocaleDateString(
                      "en-GB",
                      { day: "numeric", month: "long", year: "numeric" },
                    )}
                    reason="The day this account was created."
                  />
                )}
                {profile.isVerified && (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-teal-700">
                    <BadgeCheck aria-hidden="true" className="w-4 h-4" />
                    Your account is verified
                  </p>
                )}
              </Card>

              {settingsMissing ? (
                <NotEnabled what="Feature settings" />
              ) : (
                <Card
                  title="Features"
                  description="What MitaSafi does for you and your tenants."
                >
                  {GENERAL_TOGGLES.map((t) => (
                    <Switch
                      key={t.key}
                      id={`toggle-${t.key}`}
                      checked={bool(t.key)}
                      onChange={(v) => set(t.key, v)}
                      label={t.label}
                      description={t.description}
                      notYet={t.inForce ? undefined : t.notYet}
                    />
                  ))}
                  {settingsBar}
                </Card>
              )}

              <Card title="Closing your account">
                {deletionAt ? (
                  <p className="text-sm text-gray-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                    You asked to close this account on{" "}
                    {new Date(deletionAt).toLocaleDateString("en-GB")}. Someone
                    will be in touch. Your listings, leases and payment records
                    are untouched until then.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-gray-600">
                      Your account is attached to buildings, leases, tenants and
                      payment history that other people rely on, so nothing is
                      deleted the moment you ask. This records the request and a
                      person handles it.
                    </p>
                    {deleteError && (
                      <p role="alert" className="mt-3 text-sm text-red-700">
                        {deleteError}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError(null);
                        startDelete(async () => {
                          const r = await requestLandlordAccountDeletion();
                          if (r.success)
                            setDeletionAt(new Date().toISOString());
                          else setDeleteError(r.error ?? "Could not submit.");
                        });
                      }}
                      disabled={deleting}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 text-red-700 text-sm font-medium hover:bg-red-50 disabled:opacity-60"
                    >
                      <ShieldAlert aria-hidden="true" className="w-4 h-4" />
                      {deleting ? "Sending…" : "Ask to close my account"}
                    </button>
                  </>
                )}
              </Card>
            </>
          )}

          {tab === "Caretakers" && (
            <Card title="Caretakers and staff">
              <p className="text-sm text-gray-700">
                Managing who can see your blocks lives on its own page, because
                it is not a preference — it decides what another person can see
                about other people&apos;s homes.
              </p>
              <a
                href="/dashboard/landlord/users"
                className="mt-4 inline-block px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium"
              >
                Open Users
              </a>
              {!bool("enable_staff_access") && (
                <p className="mt-3 text-xs text-amber-700">
                  Staff access is currently switched off under General, so the
                  page will not let you add anyone yet.
                </p>
              )}
            </Card>
          )}

          {tab === "Late fee" &&
            (settingsMissing ? (
              <NotEnabled what="Late fees" />
            ) : (
              <LateFeesTab rules={lateFeeRules} buildings={buildings} />
            ))}
          {tab === "Notifications" && (
            <>
              <Card
                title="How we reach you"
                description="The channels. These are stored against your account."
              >
                {NOTIFICATION_KEYS.map((key) => (
                  <Switch
                    key={key}
                    id={`channel-${key}`}
                    checked={prefs[key]}
                    onChange={() => toggleChannel(key)}
                    label={NOTIFICATION_LABELS[key].label}
                    description={NOTIFICATION_LABELS[key].description}
                  />
                ))}
                {prefError && (
                  <p role="alert" className="mt-3 text-sm text-red-700">
                    {prefError}
                  </p>
                )}
              </Card>

              {settingsMissing ? (
                <NotEnabled what="Notification choices" />
              ) : (
                <>
                  <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                    {NOTIFICATIONS_NOT_YET_SENT}
                  </p>

                  {LANDLORD_NOTIFICATIONS.map((g) => (
                    <NotifyGroupCard
                      key={g.title}
                      title={g.title}
                      items={g.items}
                    />
                  ))}

                  {TENANT_NOTIFICATIONS.map((g) => (
                    <NotifyGroupCard
                      key={g.title}
                      title={g.title}
                      description="Sent to your tenants on your behalf, not to you."
                      items={g.items}
                    />
                  ))}

                  <Card title="Marketing">
                    <Switch
                      id="marketing-sms"
                      checked={bool("marketing_sms_opt_in")}
                      onChange={(v) => set("marketing_sms_opt_in", v)}
                      label="Send me marketing text messages"
                      description="Off unless you turn it on. Message and data rates may apply."
                    />
                  </Card>

                  <Card>{settingsBar}</Card>
                </>
              )}
            </>
          )}

          {tab === "Billing" &&
            (settingsMissing ? (
              <NotEnabled what="Billing settings" />
            ) : (
              <Card
                title="Who carries the transaction fee"
                description="Online payments cost something to process. You can pass that on or absorb it. Whatever a tenant is charged is shown to them before they pay."
              >
                <table className="w-full text-sm">
                  <caption className="sr-only">
                    Who pays the processing fee, by payment type
                  </caption>
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
                    <tr>
                      <th scope="col" className="px-4 py-2 font-medium">
                        Payment type
                      </th>
                      <th scope="col" className="px-4 py-2 font-medium">
                        Charge me
                      </th>
                      <th scope="col" className="px-4 py-2 font-medium">
                        Charge tenant
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[
                      {
                        key: "mpesa_fee_payer",
                        label: "M-Pesa",
                        note: "Paybill and STK push transactions.",
                      },
                      {
                        key: "card_fee_payer",
                        label: "Credit / debit card",
                        note: "Card payments.",
                      },
                    ].map((row) => (
                      <tr key={row.key}>
                        <th scope="row" className="px-4 py-3 text-left">
                          <span className="block font-medium text-gray-800">
                            {row.label}
                          </span>
                          <span className="block text-xs text-gray-500">
                            {row.note}
                          </span>
                          {/* Innago prints the actual fee here ($2, 2.99%).
                              MitaSafi does not charge one yet, and inventing
                              a number would be worse than saying so. */}
                          <span className="block text-xs text-gray-500">
                            No processing fee is charged today.
                          </span>
                        </th>
                        <td className="px-4 py-3">
                          <Radio
                            name={row.key}
                            value="landlord"
                            current={str(row.key)}
                            onChange={(v) => set(row.key, v)}
                            label="I pay"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Radio
                            name={row.key}
                            value="tenant"
                            current={str(row.key)}
                            onChange={(v) => set(row.key, v)}
                            label="Tenant pays"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                  Saved, but not yet applied at checkout: MitaSafi does not add
                  a processing fee to invoices today, so this records your
                  choice rather than changing what anyone is charged.
                </p>
                <div className="mt-4">{settingsBar}</div>
              </Card>
            ))}

          {tab === "Bank" && (
            <BankTab
              destinations={payoutDestinations}
              buildings={buildings}
              sampleUnit={sampleUnit}
            />
          )}

          {tab === "Integrations" && (
            <Card title="Integrations">
              <p className="text-sm text-gray-700">
                Nothing to connect yet. MitaSafi has no accounting or
                bookkeeping integrations built, so rather than list logos that
                do nothing, this is empty on purpose.
              </p>
              <p className="mt-3 text-sm text-gray-600">
                Your income and maintenance spend are on the Income and Expenses
                pages and can be read from there in the meantime.
              </p>
            </Card>
          )}
        </div>

        <HelpSidebar />
      </div>
    </div>
  );
}
