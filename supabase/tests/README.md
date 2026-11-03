# Money-path verification

## settlement_integrity_test.sql

Behavioural test suite for the payment settlement path added in
`20260324000000_payment_settlement_integrity.sql`.

It builds its own fixtures (auth user -> profile -> provider -> booking walked
through the real state machine -> payment), exercises the settlement and payout
functions, and then **deliberately raises an exception** so the whole
transaction rolls back. Nothing it creates survives. The test report arrives in
the error message, which is intentional, not a failure.

Run it against any environment with:

    psql "$DATABASE_URL" -f supabase/tests/settlement_integrity_test.sql

or through the Supabase SQL editor. A healthy run ends with:

    SUITE_RESULT pass=15 fail=0

What it proves:

| Test | Defect it guards against |
|---|---|
| T1  | a clean settlement credits exactly once and writes one ledger row |
| T2  | a replayed settlement does not credit twice |
| T3  | a FAILED payment cannot be resurrected to completed and credited (this was the forged-callback wallet mint) |
| T4  | a callback claiming a different amount is flagged, and OUR stored amount is what gets booked |
| T5  | a second open payment for one booking is rejected (double charge) |
| T6  | an M-Pesa receipt cannot settle two payments (replay) |
| T7  | the wallet ledger is append-only, against UPDATE and DELETE |
| T8  | payout debit + payout row + ledger entry are one atomic unit |
| T8b | a payout does not inflate lifetime total_earnings |
| T9  | a second concurrent payout is refused; an overdraw is refused |
| T10 | an abandoned pending payment expires and does not lock the booking forever |
| inv | amount = platform_fee + provider_amount, and ledger sum == wallet balance |

The suite has been mutation-tested: reinstating the original settlement logic
and dropping the new indexes/trigger fails 12 of the 15 assertions. A suite that
still passes against that mutant is worthless — if you change the suite, re-run
the mutant in `scratchpad/verify-settle/mutant.sql` and confirm it still fails.
