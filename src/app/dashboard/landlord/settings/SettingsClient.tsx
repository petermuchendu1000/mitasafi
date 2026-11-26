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
  late_fee_amount: null,
  late_fee_percentage: 10,
  grace_period_days: 5,
  late_fee_applies_to: "all_line_items",
  mpesa_fee_payer: "tenant",
  card_fee_payer: "tenant",
  lease_expiry_notice_days: 90,
  overdue_summary_day_1: 5,
  overdue_summary_day_2: 10,
  tenant_invoice_due_notice_days: 5,
  tenant_lease_expiry_notice_days: 90,
  marketing_sms_opt_in: false,
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
  settingsMissing,
}: {
  profile: SettingsProfile;
  channels: NotificationPreferences;
  settings: Settings | null;
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
              <div className="pb-3 -mt-1">
                <NumberField
                  id={`n-${n.numberKey}`}
                  label={`${n.label}: how many`}
                  value={num(n.numberKey)}
                  onChange={(v) => set(n.numberKey as string, v)}
                  suffix={n.numberSuffix}
                  min={n.min}
                  max={n.max}
                />
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
              <Card
                title="Late payment fees"
                description="The default applied to leases you create from now on. Leases already signed keep the terms they were signed with — changing a policy must not rewrite an agreement."
              >
                <Switch
                  id="late-fee-enabled"
                  checked={bool("late_fee_enabled")}
                  onChange={(v) => set("late_fee_enabled", v)}
                  label="Charge a late fee"
                />

                {bool("late_fee_enabled") && (
                  <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
                    <div>
                      <label
                        htmlFor="late-fee-type"
                        className="block text-sm font-medium text-gray-700"
                      >
                        How it is calculated
                      </label>
                      <select
                        id="late-fee-type"
                        value={str("late_fee_type")}
                        onChange={(e) => set("late_fee_type", e.target.value)}
                        className={input}
                      >
                        {LATE_FEE_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {str("late_fee_type") === "percentage" ? (
                      <div>
                        <label
                          htmlFor="late-fee-pct"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Percentage
                        </label>
                        <input
                          id="late-fee-pct"
                          type="number"
                          min={0}
                          max={100}
                          value={num("late_fee_percentage")}
                          onChange={(e) =>
                            set("late_fee_percentage", Number(e.target.value))
                          }
                          className={`${input} w-32`}
                        />
                      </div>
                    ) : (
                      <div>
                        <label
                          htmlFor="late-fee-amt"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Amount in KES
                        </label>
                        <input
                          id="late-fee-amt"
                          type="number"
                          min={0}
                          value={num("late_fee_amount")}
                          onChange={(e) =>
                            set("late_fee_amount", Number(e.target.value))
                          }
                          className={`${input} w-40`}
                        />
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Grace period
                      </p>
                      <p className="text-xs text-gray-500 mb-1">
                        Days after the due date before the fee applies.
                      </p>
                      <NumberField
                        id="grace-days"
                        label="Grace period in days"
                        value={num("grace_period_days")}
                        onChange={(n) => set("grace_period_days", n)}
                        suffix="days"
                        min={0}
                        max={60}
                      />
                    </div>

                    <fieldset>
                      <legend className="text-sm font-medium text-gray-700">
                        Applies to
                      </legend>
                      <div className="mt-2 flex flex-col gap-2">
                        <Radio
                          name="applies-to"
                          value="all_line_items"
                          current={str("late_fee_applies_to")}
                          onChange={(v) => set("late_fee_applies_to", v)}
                          label="Everything on the invoice"
                        />
                        <Radio
                          name="applies-to"
                          value="rent_only"
                          current={str("late_fee_applies_to")}
                          onChange={(v) => set("late_fee_applies_to", v)}
                          label="Rent only"
                        />
                      </div>
                    </fieldset>
                  </div>
                )}

                <div className="mt-4">{settingsBar}</div>
              </Card>
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
                <div className="divide-y divide-gray-100">
                  <div className="py-4 first:pt-0">
                    <p className="text-sm font-medium text-gray-800">M-Pesa</p>
                    <p className="text-xs text-gray-500 mb-2">
                      Paybill and STK push transactions.
                    </p>
                    <div className="flex gap-6">
                      {FEE_PAYERS.map((p) => (
                        <Radio
                          key={p.value}
                          name="mpesa-fee"
                          value={p.value}
                          current={str("mpesa_fee_payer")}
                          onChange={(v) => set("mpesa_fee_payer", v)}
                          label={p.label}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="py-4">
                    <p className="text-sm font-medium text-gray-800">
                      Card payments
                    </p>
                    <p className="text-xs text-gray-500 mb-2">
                      Credit and debit cards.
                    </p>
                    <div className="flex gap-6">
                      {FEE_PAYERS.map((p) => (
                        <Radio
                          key={p.value}
                          name="card-fee"
                          value={p.value}
                          current={str("card_fee_payer")}
                          onChange={(v) => set("card_fee_payer", v)}
                          label={p.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                  Saved, but not yet applied at checkout: MitaSafi does not add
                  a processing fee to invoices today, so this records your
                  choice rather than changing what anyone is charged.
                </p>
                <div className="mt-4">{settingsBar}</div>
              </Card>
            ))}

          {tab === "Bank" && (
            <Card title="Bank and payouts">
              <p className="text-sm text-gray-700">
                MitaSafi does not hold or disburse your rent. Tenants pay you
                directly and MitaSafi records what was paid, so there is no
                payout account to set up and no balance waiting to be released.
              </p>
              <p className="mt-3 text-sm text-gray-600">
                Across the whole database the only payout machinery that exists
                belongs to the home-services side, for paying service providers.
                Nothing in it touches rent.
              </p>
              <p className="mt-3 text-sm text-gray-600">
                If MitaSafi ever does collect on your behalf, this is where the
                account would go — and you would be told before a shilling
                moved.
              </p>
            </Card>
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
      </div>
    </div>
  );
}
