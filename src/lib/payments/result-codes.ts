/**
 * Daraja result-code helpers.
 *
 * Deliberately a plain module with NO "use server" directive. It is imported by
 * both the Server Action module and the internal payment module; putting these
 * in either one would drag the other's exports into the wrong trust boundary.
 */

/**
 * Daraja ResultCodes that represent a DEFINITELY terminal failure, where the
 * customer's attempt is over and retrying is the only way forward.
 *
 * Deliberately conservative. A code that is not listed here is treated as
 * "still in progress" and the payment is left open, because closing a payment
 * that is actually still live would let the customer start a second one and be
 * charged twice. Anything genuinely abandoned is retired by
 * expire_stale_booking_payments instead, which is bounded by time rather than
 * by our interpretation of a vendor code.
 *
 * Notably absent: 1001 ("transaction in process") and 1037 in its
 * "request in progress" sense, both of which can still settle.
 */
export const TERMINAL_STK_FAILURE_CODES: ReadonlySet<number> = new Set([
  1,    // insufficient balance
  1019, // transaction expired
  1032, // request cancelled by user
  2001, // wrong PIN / invalid credentials
]);

/**
 * Normalise a Daraja result code to a number, or null if it cannot be trusted.
 *
 * The two Daraja endpoints disagree about this field's type: the STK callback
 * delivers ResultCode as a JSON number, while stkpushquery returns it as a
 * STRING ("0" means success). Comparing the string form against 0 silently
 * never matches, which is how `queryResult.resultCode` being falsy-at-zero hid
 * the success case in the old polling code.
 *
 * Returns null for absent, blank or non-integer values. Null must always be
 * treated as "unknown", never as success and never as failure — an unparseable
 * code is not evidence of anything.
 */
export function parseStkResultCode(code: string | number | undefined | null): number | null {
  if (code === undefined || code === null) return null;
  if (typeof code === "number") return Number.isInteger(code) ? code : null;
  const trimmed = code.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? parsed : null;
}
