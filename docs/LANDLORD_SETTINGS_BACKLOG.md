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
- **Settings** — staff have no settings surface of their own.

### The gateway, and what is left of it

MitaSafi now records where rent is collected and can state the exact
instruction a tenant should follow. What is **not** built:

- ~~No tenant-facing view~~ — **built.** `/dashboard/rent` shows a tenant
  their unit, their rent, the exact instruction, and every payment the
  landlord has recorded. Four RLS policies in 20260359000000 scope it through
  `tenants.user_id = auth.uid()`.
- **No automatic reconciliation.** A paybill payment carrying the unit number
  _could_ be matched to a lease by a C2B callback; nothing listens for one, so
  payments are still recorded by hand.
- **No STK push for rent.** The Daraja code in `src/lib/payments` belongs to
  the home-services side and pushes to MitaSafi's own shortcode. Pushing to a
  landlord's paybill needs per-landlord Daraja credentials and an aggregator
  relationship, which is a commercial decision, not a coding one.
- MitaSafi deliberately **never holds the money**. There is no balance, no
  float and no payout to withhold, and there is no plan here to add one.

### Found while building the gateway, deliberately not acted on

- **`anon` holds table-level SELECT on `payments`.** It returns nothing —
  payments has no anon policy and RLS is on, both asserted in
  20260359000000 — but the grant itself is untidy. Revoking it would turn a
  silent empty result into an error for any caller relying on it, which is a
  change that migration had no business making on its own.
- **`leases.building_id` is derived, not protected.** A column-level REVOKE is
  inert while `authenticated` holds table-level UPDATE on leases, so instead
  of re-cutting privileges on a live table the column is recomputed from the
  unit on every write. A client write is overwritten rather than refused;
  proven behaviourally (T14).

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
