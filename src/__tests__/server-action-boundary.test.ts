/**
 * The Server Action trust boundary.
 *
 * In the Next.js App Router, a "use server" directive at the top of a module
 * turns EVERY export of that module into a publicly callable HTTP endpoint as
 * soon as any client component imports any one of them. There is no per-export
 * opt-out.
 *
 * src/app/dashboard/provider/earnings/payout/PayoutForm.tsx is a client
 * component that imports requestPayout from src/lib/services/payments.ts. That
 * single import published every export of that module. Two of them had no
 * authentication at all:
 *
 *   processPayoutCompletion — marks a payout 'completed' with a caller-supplied
 *     receipt number. The wallet is debited when the payout is REQUESTED, so
 *     closing one erases the obligation: balance gone, record says paid.
 *   processPaymentCallback — settles a payment. Reaching it directly bypasses
 *     the M-Pesa callback route's IP whitelist, fail-closed config gate and
 *     body-size guard entirely.
 *
 * These tests fail if either function returns to the action module, or if the
 * internal module ever acquires the directive. They are deliberately textual:
 * the property being protected is a property of the FILE, not of runtime
 * behaviour, and it cannot be observed by calling anything.
 */

import fs from "fs";
import path from "path";

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

/** True only for a real directive statement, not the string appearing in prose. */
function hasUseServerDirective(source: string): boolean {
  return source
    .split("\n")
    .some((line) => /^\s*["']use server["'];?\s*$/.test(line));
}

const ACTION_MODULE = "src/lib/services/payments.ts";
const INTERNAL_MODULE = "src/lib/services/payments-internal.ts";

/** Functions that must never be reachable as a Server Action. */
const MUST_NOT_BE_ACTIONS = [
  "processPaymentCallback",
  "processPayoutCompletion",
];

describe("the Server Action boundary around payments", () => {
  it("keeps the internal payment module free of the directive", () => {
    expect(hasUseServerDirective(read(INTERNAL_MODULE))).toBe(false);
  });

  it("detects a directive when one is present (the check can fail)", () => {
    // Guards the guard: if hasUseServerDirective were broken, every other
    // assertion here would pass vacuously.
    expect(hasUseServerDirective('"use server";\nexport const a = 1;')).toBe(true);
    expect(hasUseServerDirective("'use server'\nexport const a = 1;")).toBe(true);
    // ...and does not fire on the string merely being mentioned.
    expect(hasUseServerDirective('// mentions "use server" in a comment')).toBe(false);
    expect(hasUseServerDirective('const s = "use server";')).toBe(false);
  });

  it("does not export the unauthenticated operations from the action module", () => {
    const action = read(ACTION_MODULE);
    expect(hasUseServerDirective(action)).toBe(true); // it IS an action module
    for (const fn of MUST_NOT_BE_ACTIONS) {
      expect(action).not.toMatch(new RegExp(`^export\\s+(async\\s+)?function\\s+${fn}\\b`, "m"));
      expect(action).not.toMatch(new RegExp(`^export\\s*\\{[^}]*\\b${fn}\\b`, "m"));
    }
  });

  it("defines those operations in the internal module instead", () => {
    const internal = read(INTERNAL_MODULE);
    for (const fn of MUST_NOT_BE_ACTIONS) {
      expect(internal).toMatch(new RegExp(`export\\s+async\\s+function\\s+${fn}\\b`));
    }
  });

  it("has the callback route import from the internal module", () => {
    const route = read("src/app/api/payments/mpesa/callback/route.ts");
    expect(route).toMatch(/from "@\/lib\/services\/payments-internal"/);
    expect(route).not.toMatch(/processPaymentCallback.*from "@\/lib\/services\/payments"/);
  });

  it("every export left in the action module is an authenticated user operation", () => {
    // Inventory lock. Adding an export here is fine, but it must be a
    // deliberate act: anything in this list is reachable by any client that can
    // reach any other export in the module.
    const action = read(ACTION_MODULE);
    const exported = [...action.matchAll(/^export\s+async\s+function\s+(\w+)/gm)].map((m) => m[1]);
    expect(exported.sort()).toEqual(
      [
        "getBookingPayments",
        "getPaymentStatus",
        "getProviderEarnings",
        "getProviderTransactions",
        "initiatePayment",
        "pollPaymentStatus",
        "requestPayout",
      ].sort()
    );
  });
});
