/**
 * Turning "SFG12ABCDE Confirmed. Ksh30,000.00 received from…" into a payment
 * against the right lease.
 *
 * THE RULE THIS WHOLE MODULE IS BUILT AROUND
 *   A match is made only when it is UNAMBIGUOUS. Two leases whose unit
 *   numbers both normalise to the same thing produce no match and a reason,
 *   not a coin toss. Crediting rent to the wrong tenant is worse than leaving
 *   it unmatched: the tenant who actually paid still shows as in arrears, and
 *   somebody else's account is quietly wrong.
 *
 * WHAT IS DELIBERATELY NOT USED TO MATCH
 *   The amount. A tenant who pays half their rent has still paid; matching on
 *   amount would strand exactly the people most likely to be chased.
 *   The payer's phone number, as a primary key — it is used only to break a
 *   tie the reference could not, and never on its own, because the person who
 *   sends the money is often not the person on the lease.
 */

import {
  leaseCoversPeriod,
  recentPeriods,
  earliestRecordedPeriod,
  beforePeriod,
  periodKey,
  type CivilDate,
} from "./rent-status";

export interface InboundPayment {
  transId: string;
  amount: number;
  billRef: string | null;
  msisdn: string | null;
  payerName: string | null;
  transTime: string;
}

export interface LeaseCandidate {
  leaseId: string;
  unitNumber: string | null;
  tenantPhone: string | null;
  tenantName: string | null;
  status: string | null;
}

export type MatchOutcome =
  | { matched: true; leaseId: string; reason: string }
  | { matched: false; reason: string };

/**
 * Normalise a reference for comparison: case, spaces, dashes and the dots
 * people put in unit numbers all vary between what a landlord typed into
 * MitaSafi and what a tenant typed into their phone.
 *
 * "a-1", "A 1" and "a1." all become "A1". That is the point.
 */
export function normaliseRef(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .toUpperCase()
    .replace(/[\s._\-/#]/g, "")
    .trim();
}

/** Digits only, last nine, so 0712…, +254712… and 254712… compare equal. */
function phoneKey(raw: string | null | undefined): string {
  if (!raw) return "";
  const d = raw.replace(/\D/g, "");
  return d.length >= 9 ? d.slice(-9) : "";
}

const LIVE_STATUSES = new Set(["active", "pending", "renewed", null as never]);

function isLive(l: LeaseCandidate): boolean {
  return l.status === null || LIVE_STATUSES.has(l.status);
}

/**
 * Decide which lease an inbound payment belongs to.
 *
 * Order matters and is deliberate: the reference is the thing the tenant was
 * told to type and the only field that identifies an ACCOUNT. The phone is a
 * fallback for payments that arrive with no usable reference at all.
 */
export function matchPayment(
  p: InboundPayment,
  candidates: LeaseCandidate[],
): MatchOutcome {
  const live = candidates.filter(isLive);

  if (live.length === 0) {
    return {
      matched: false,
      reason: "You have no live leases to match against.",
    };
  }

  const ref = normaliseRef(p.billRef);

  if (ref !== "") {
    const byRef = live.filter((l) => normaliseRef(l.unitNumber) === ref);

    if (byRef.length === 1) {
      return {
        matched: true,
        leaseId: byRef[0].leaseId,
        reason: `Account "${p.billRef}" matches unit ${byRef[0].unitNumber}.`,
      };
    }

    if (byRef.length > 1) {
      // Two units normalising the same way. A guess here puts money on the
      // wrong account, so the landlord decides.
      return {
        matched: false,
        reason: `Account "${p.billRef}" matches ${byRef.length} units, so it is ambiguous. Assign it yourself.`,
      };
    }
  }

  // No usable reference. The phone may still identify them — but only if it
  // identifies exactly one, and only because the alternative is dropping it.
  const key = phoneKey(p.msisdn);
  if (key !== "") {
    const byPhone = live.filter((l) => phoneKey(l.tenantPhone) === key);
    if (byPhone.length === 1) {
      return {
        matched: true,
        leaseId: byPhone[0].leaseId,
        reason:
          ref === ""
            ? `No account number was given, but the number that paid is on one lease (unit ${byPhone[0].unitNumber}).`
            : `Account "${p.billRef}" matched no unit, but the number that paid is on one lease (unit ${byPhone[0].unitNumber}).`,
      };
    }
    if (byPhone.length > 1) {
      return {
        matched: false,
        reason: `The number that paid is on ${byPhone.length} leases, so it is ambiguous. Assign it yourself.`,
      };
    }
  }

  return {
    matched: false,
    reason:
      ref === ""
        ? "No account number was given and the number that paid is not on any lease."
        : `Account "${p.billRef}" matches no unit, and the number that paid is not on any lease.`,
  };
}

// ---------------------------------------------------------------------------
// Reading an M-Pesa confirmation
// ---------------------------------------------------------------------------

/**
 * Safaricom's confirmation text, parsed.
 *
 * Returns null rather than a half-filled object when the essentials are
 * missing: a row in the money inbox with a guessed amount is worse than no
 * row. The shapes below are the ones Safaricom actually sends for Pay Bill
 * and Buy Goods; anything else is rejected and the landlord is told why.
 */
export function parseMpesaMessage(text: string): InboundPayment | null {
  if (!text || text.trim() === "") return null;
  const s = text.replace(/\s+/g, " ").trim();

  // The code is the first token and is always alphanumeric, length >= 8.
  const code = /^([A-Z0-9]{8,})\s+Confirmed/i.exec(s);
  if (!code) return null;

  const amount = /Ksh\s?([\d,]+(?:\.\d{1,2})?)/i.exec(s);
  if (!amount) return null;
  const value = Number(amount[1].replace(/,/g, ""));
  if (!Number.isFinite(value) || value <= 0) return null;

  // "received from WANJIRU KARIUKI 0712345678" — the name runs until the
  // phone number, which is the only reliable terminator.
  const from =
    /(?:received from|from)\s+([A-Z' .-]+?)\s*(\+?\d[\d\s]{7,})/i.exec(s);

  // Pay Bill carries an account; Buy Goods does not.
  const acct =
    /Account\s*(?:Number|No\.?)?\s*[:.]?\s*([A-Za-z0-9._\-/#]+)/i.exec(s);

  // The capture runs to the end of the sentence, so "Account Number A1."
  // yields "A1." — matching would still work because normaliseRef strips
  // dots, but the landlord would be SHOWN a reference the tenant never typed.
  const ref = acct ? acct[1].replace(/[.,;:]+$/, "") : null;

  return {
    transId: code[1].toUpperCase(),
    amount: value,
    billRef: ref === "" ? null : ref,
    msisdn: from ? from[2].replace(/\s/g, "") : null,
    payerName: from ? from[1].trim().replace(/\s+/g, " ") : null,
    // The message's own timestamp is ambiguous (2-digit year, no zone), so
    // the time it was ingested is used instead and the raw text is kept.
    transTime: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Which month's rent does this settle?
// ---------------------------------------------------------------------------

/**
 * THE PERIOD IS NOT THE PAYMENT DATE, and a payment with no period at all is
 * worse than either.
 *
 * `payments` carries both `payment_date` (when the money arrived) and
 * (period_year, period_month) (which month it settles). Every rent-status
 * calculation in the product keys on the PERIOD and skips rows where it is
 * null — `rent/page.tsx` and the building page both `continue` on a null
 * period, and `rollUpPortfolio` filters on it.
 *
 * The first version of the reconcile action set neither. The payment was
 * created, the money showed on the Income page (which keys on payment_date),
 * and the tenant still read as OVERDUE on the Rent Collection page. A
 * reconciliation feature whose payments do not clear the arrears it exists to
 * clear is not reconciling anything.
 *
 * The manual form asks the landlord which month. Matching cannot ask, so it
 * uses the rule a landlord would apply to an unallocated payment: settle the
 * OLDEST month that is still owing. A tenant two months behind who pays is
 * credited against the older debt first, not the current one.
 *
 * AND THE PART THAT STOPS THAT RULE INVENTING DEBT
 *   "Still owing" is only meaningful where a ledger exists. A real lease on
 *   this project starts 1 February with its first recorded rent in August:
 *   the landlord was collecting all along and only began recording in August.
 *   Walking back to the lease start would call February through July unpaid
 *   and quietly file today's money against February — six months of debt
 *   conjured out of an absence of records, and the current month left looking
 *   unpaid.
 *
 *   So the ledger begins at the FIRST RECORDED rent period, never before it.
 *   With no recorded rent at all there is no ledger to be behind in, and the
 *   payment settles the current month.
 *
 * It deliberately does NOT split one payment across two months. That is
 * apportioning, it is listed as not built, and guessing at it here would put
 * invented figures into two periods instead of one honest one.
 */
export interface LeaseRentTerms {
  monthlyRent: number;
  rentDueDay: number;
  gracePeriodDays: number;
  startDate: string;
  endDate: string | null;
}

export interface PeriodKey {
  year: number;
  month: number;
}

export function periodToSettle(
  terms: LeaseRentTerms,
  /** Confirmed rent already credited, by `periodKey`. */
  paidByPeriod: Map<string, number>,
  today: CivilDate,
  lookbackMonths = 12,
): PeriodKey {
  const current: PeriodKey = { year: today.year, month: today.month };
  const covered = recentPeriods(current, Math.max(1, lookbackMonths)).filter(
    (p) =>
      leaseCoversPeriod(
        { start_date: terms.startDate, end_date: terms.endDate },
        p,
      ),
  );

  // Where the ledger starts. With nothing recorded, `current` means the loop
  // below considers only the current month — there is no history to be
  // behind in, so none is invented.
  const ledgerStart = earliestRecordedPeriod(paidByPeriod) ?? current;

  for (const p of covered) {
    if (beforePeriod(p, ledgerStart)) continue;
    const owed = Math.max(0, terms.monthlyRent);
    const paid = Math.max(0, paidByPeriod.get(periodKey(p)) ?? 0);
    if (owed - paid > 0) return p;
  }

  // Nothing owing. Credit the last month the lease was actually in force —
  // for an ended lease that is not today, and saying it is would file money
  // against a month with no tenancy in it.
  return covered.length > 0 ? covered[covered.length - 1] : current;
}

/** Split a pasted block into individual confirmations. */
export function splitMessages(text: string): string[] {
  return text
    .split(/\n{2,}|(?=\b[A-Z0-9]{8,}\s+Confirmed)/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}
