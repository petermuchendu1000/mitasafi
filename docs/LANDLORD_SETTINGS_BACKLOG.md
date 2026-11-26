# Landlord settings & users — what is built, and what is not

Written 2026-11-26. Every "not built" line here is a thing the UI either does
not offer, or offers with a visible "recorded only" label. Nothing in the
product claims to do something on this list.

## Built and enforced

| Area                      | State                                                              |
| ------------------------- | ------------------------------------------------------------------ |
| Settings: General toggles | Stored. **2 of 7 enforced** — applications screening, staff access |
| Settings: Notifications   | Stored, all fields editable incl. both overdue-summary days        |
| Settings: Billing         | Stored (who carries the fee)                                       |
| Settings: Late fees       | **Multiple rules**, each with its own assignment and summary line  |
| Users: access matrix      | **7 of 12 modules enforced by RLS**                                |
| Users: role presets       | 5 presets + Custom, with a side-by-side comparison table           |
| Users: scope              | All properties, or named blocks; maintenance category mode         |
| Users: lifecycle          | Add, edit, suspend, restore, remove; phone-linked to an account    |

## Not built — each one is labelled in the UI

### Settings toggles that gate features that do not exist

- **Tenant maintenance requests** — there is no tenant-facing submission UI at all.
- **Accept partial payments** — invoices do not check a flag before accepting an amount.
- **Accept payments in advance** — no advance-payment path exists.
- **Chat with tenants** — landlord↔tenant messaging has not been built.
- **Require renter's insurance** — nowhere to record a policy.

### Access modules recorded but not enforced

- **Expenses** — expenses _are_ maintenance costs on the same rows, so
  `access_maintenance` already governs them. A separate level would be a
  second switch on one thing.
- **Reports** — no reporting module exists.
- **Messaging** — see above.
- **Bank** — MitaSafi does not hold or disburse rent.
- **Settings** — staff have no settings surface of their own.

### Other known gaps

- **Avatar / Upload Picture** on a user — needs a storage bucket and an upload
  policy decision. Deliberately left out rather than half-built.
- **Allow custom category** — stored, but maintenance categories are a fixed
  list today, so it changes nothing.
- **Late fees are not applied to invoices.** The rules are stored and
  assignable; nothing computes a fee from them yet.
- **Notification delivery.** No scheduled email or SMS exists, so the
  preferences decide what _will_ be sent, not what is.
- **Billing fees are not charged.** No processing fee is added at checkout.
- **Staff acceptance flow.** A staff member is linked when a MitaSafi account
  already exists on their phone number. There is no invitation email, and no
  way for someone to accept an invitation and create an account from it.
- **HOA tools** and **Internet services** (both in Innago) — US-specific,
  deliberately not carried over.

## Dependencies that are properties of the schema, not choices

- **Tenant access cannot be scoped to a block.** A tenant belongs to a lease,
  not a building, and a tenants policy that reads leases creates a policy
  cycle. Tenant access is therefore portfolio-wide or nothing.
- **Invoice access requires lease access.** A payment reaches a block only
  through its lease.

Both are stated on screen beside the controls and asserted in
`supabase/tests/landlord_settings_staff_test.sql`.
