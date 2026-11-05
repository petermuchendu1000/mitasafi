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

| Test | Defect it guards against                                                                                    |
| ---- | ----------------------------------------------------------------------------------------------------------- |
| T1   | a clean settlement credits exactly once and writes one ledger row                                           |
| T2   | a replayed settlement does not credit twice                                                                 |
| T3   | a FAILED payment cannot be resurrected to completed and credited (this was the forged-callback wallet mint) |
| T4   | a callback claiming a different amount is flagged, and OUR stored amount is what gets booked                |
| T5   | a second open payment for one booking is rejected (double charge)                                           |
| T6   | an M-Pesa receipt cannot settle two payments (replay)                                                       |
| T7   | the wallet ledger is append-only, against UPDATE and DELETE                                                 |
| T8   | payout debit + payout row + ledger entry are one atomic unit                                                |
| T8b  | a payout does not inflate lifetime total_earnings                                                           |
| T9   | a second concurrent payout is refused; an overdraw is refused                                               |
| T10  | an abandoned pending payment expires and does not lock the booking forever                                  |
| inv  | amount = platform_fee + provider_amount, and ledger sum == wallet balance                                   |

The suite has been mutation-tested: reinstating the original settlement logic
and dropping the new indexes/trigger fails 12 of the 15 assertions. A suite that
still passes against that mutant is worthless — if you change the suite, re-run
the mutant in `scratchpad/verify-settle/mutant.sql` and confirm it still fails.

## profile_read_scope_test.sql

Verifies `20260335000000_scope_profile_reads.sql`.

`profiles` carried `profiles_public_read FOR SELECT TO authenticated
USING (true)`. RLS is row-level — it cannot restrict columns — and SELECT was
granted on all 11 columns, so any signed-in account could run
`select email, phone, metadata from profiles` across the whole user table.
Registration is free, so the price of that read was one throwaway signup. The
permissive policy also subsumed the ownership policy outright: as
`authenticated`, `EXPLAIN` on a profiles scan emitted no Filter line at all.

Measured against the live project before the fix: another user's email, phone
and metadata were all readable from a second account.

A healthy run ends with:

    PROFILE_READ_RESULT pass=21 fail=0

| Test     | What it holds down                                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P1–P3    | another user's email, phone and metadata are NOT readable                                                                                                    |
| P4       | a user still reads their OWN row in full (the thing a narrowing fix breaks)                                                                                  |
| P5       | anon reads no `profiles` row directly                                                                                                                        |
| P6, P8   | provider and review-author names ARE readable via `profiles_public`                                                                                          |
| P7       | anon can read review-author names — this path was already broken, because the old policy was `TO authenticated`, so signed-out visitors saw no bylines       |
| P9       | the view projects exactly `id, full_name, avatar_url`                                                                                                        |
| P10      | the provider holding a booking can read that customer's name                                                                                                 |
| P11, P12 | an unrelated account, and anon, cannot — the view is not a user directory                                                                                    |
| P13–P15  | UPDATE/INSERT/DELETE through the view are refused (a single-table view is auto-updatable and runs with owner rights, so a write through it would bypass RLS) |
| P16, P18 | the blanket policy is gone and an ownership-scoped SELECT policy survives                                                                                    |
| P17      | hiding a review also hides its author                                                                                                                        |
| P19      | the view has no `email` column to read, probed dynamically so a regrown column fails rather than breaking the parse                                          |

Mutation-tested: reinstating `profiles_public_read USING (true)` on the test
database fails P1, P2, P3 and P16, and the CI runner exits 1.

## public_visibility_test.sql

Verifies `20260339000000_public_listing_visibility.sql`. 17 assertions.

Two tables had RLS enabled, the SELECT privilege granted to the client roles,
and no policy that let those roles read anything. PostgREST does not error in
that state — a filtered `.select()` returns `[]` and a filtered embed returns
`null` — so both defects were silent.

**`service_types`.** `20260312000000_rls_complete_coverage.sql` gave each
catalogue table a `<t>_public_read` / `<t>_service_role_all` pair.
`service_types` got only the `service_role` half. Measured as owner: 12 rows; as
`authenticated`: 0; as `anon`: 0 — on the live project and again in a clean-room
build from the migration files alone, which rules out production drift. The
booking page reads the type through an embed and falls back on absence
(`src/app/services/provider/[id]/request/page.tsx:125,156`,
`booking_flow ?? "standard"`), and only 4 of the 12 seeded types are
`standard`. The other 8 — emergency, delivery, project, personal — were every
one of them booked in the `standard` shape, with no error and no log.

**`listings`.** `Public can view active listings USING (status = 'active')` hid
paused and rented properties from everyone but the landlord, while six call
sites read one expecting a row. `src/app/api/listing-waitlist/route.ts:71-74`
therefore answered 404 for exactly the listings the waitlist exists for, and its
`status === "active"` branch at `:83` is evidence no non-active row ever came
back. `src/app/api/saved-listings/route.ts:29-45` embeds `listings` on
`saved_listings`, so a saved card lost its title, rent and photo the moment the
landlord marked the property rented.

`listings_public_read` now admits `active`, `paused`, `rented`. Draft, expired
and archived stay landlord-only, and because `status` is nullable and its CHECK
passes on NULL, V11 pins down that `= ANY (...)` fails closed on a null status.

**The asymmetry V16/V17 exist for.** `profiles_public` still admits a landlord's
identity only on `status = 'active'`. A property becoming viewable is not a
reason to publish its owner's name, and none of the repaired reads wants one, so
the two predicates deliberately differ. V17 and a guard in the migration both
fail if someone aligns them.

Run:

    psql "$DATABASE_URL" -f supabase/tests/public_visibility_test.sql

A healthy run ends with

    PUBLIC_VISIBILITY_RESULT pass=17 fail=0

Proven to bite: against the pre-migration schema the suite reports
`pass=9 fail=8`, failing exactly V1-V4, V6, V7, V14 and V15 — and the pre-state
reproduces the defect's own words, `embed gave NULL -> every emergency booking
is created as standard`. The migration's six guards were mutation-tested the
same way: omit the `service_types` policy, narrow the listing predicate to
active, widen it to admit draft, add a blanket `USING (true)` on listings, widen
`profiles_public` to paused/rented, or revoke `anon`'s SELECT on
`service_types` — 6 mutants generated, 6 killed, 0 survived, with the
unmutated migration passing as the control.

## location_privacy_test.sql

Verifies `20260340000000_enforce_hide_exact_address.sql`. 21 assertions.

`listings.hide_exact_address` promised, in the product's own words, that a
landlord's exact location was withheld — `ListingMap.tsx:209-214` renders an
"Approximate" badge and `:281-286` renders "Exact address shared after
inquiry". It was enforced at **no layer at all**:

- **No database enforcement.** No view, no policy and no non-trigger function
  in `public` referenced the column, while `anon` _and_ `authenticated` both
  held column-level SELECT on `address`, `latitude` and `longitude`. RLS is
  row-level and cannot restrict columns.
- **PostgREST is public by construction.** `src/lib/supabase/client.ts:17-18`
  uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, which
  Next inlines into the browser bundle, so
  `GET /rest/v1/listings?select=address,latitude,longitude` answered for a
  signed-out stranger with no application code in the path. No server-component
  masking could have helped.
- **The client never withheld it either.**
  `ListingDetailClient.tsx:372-379` passes all four fields as props to a
  `"use client"` component, so they were serialised into the RSC payload for
  every viewer whatever the flag said. `ListingMap.tsx:222` merely declined to
  _render_ the address string.
- **The "approximate" map was centred on the exact point.**
  `ListingMap.tsx:86` centres at `[longitude, latitude]`, `:112` gives the
  circle those same exact coordinates, and `"circle-radius": 80` is **pixels**.
  Privacy mode was a zoom level — 13 instead of 15 — and a screen-space ring
  around the true location.
- **`ListingMap.tsx:243-252` rendered a Directions link unconditionally**,
  outside the privacy branch, with the exact coordinates in the Google Maps
  URL — beside the sentence promising the address was not shared yet.

`public.listings_public` now projects all 100 columns of `listings`, so
`select("*")` against it is a drop-in, and masks four: `address` and
`building_name` to NULL, `latitude` and `longitude` snapped to a 0.005° grid —
but only for viewers who are not the landlord, which is what keeps the
dashboard and the edit form working. The client SELECT privilege on those four
columns is revoked from the table, since the view is useless while the table
still answers.

`building_name` is masked too: in Nairobi a building name _is_ the address, and
`ListingMap.tsx:244` feeds it to Google Maps as a geocodable destination, so
leaving it would be a one-field bypass.

**Why a grid rather than NULL or random jitter.** NULL kills the map —
`ListingMap.tsx:229` falls through to "Map not available" — so every
privacy-respecting listing would lose its map. Random jitter per request is
worse than useless: repeated reads average out and recover the true point.
Grid snapping is deterministic, so it reveals only a cell. Measured: a
Nairobi listing at `-1.29210000, 36.82190000` publishes as `-1.290, 36.820`,
**315 m** from the truth, inside the ~1528 m circle the UI draws (80 px at
zoom 13). L5 and L6 bound that offset from both sides — too far and the map
would exclude the real address, too close and it protects nobody.

Run:

    psql "$DATABASE_URL" -f supabase/tests/location_privacy_test.sql

A healthy run ends with

    LOCATION_PRIVACY_RESULT pass=21 fail=0

**Proven to bite.** The original vulnerability was reconstructed — the view
installed with its reveal predicate replaced by `true`, and the four columns
re-granted on the table — and the suite reported `pass=11 fail=10`, naming it:
`FAIL L1 hidden listing published its address: House 4, Mandera Rd` and
`FAIL L16 one free signup still reads every exact address`.

The migration's guards were mutation-tested: 10 mutants, 10 killed, 0 survived,
control passing. **Two of those guards were blind on the first attempt and the
mutation run is what found them** — guard (c) required "table SELECT held _and_
no column grants", a conjunction this migration can never produce, so it was
unfirable; and guard (h) asked only whether `hide_exact_address` appeared in
the view definition, which is always true because the column is one of the 100
the view projects. Both now assert counted, structural facts.

The code-layer companion is `src/__tests__/location-privacy-scope.test.ts`
(5 tests), which sweeps for the defect's shape — any `.from("listings")` chain
whose `.select()` names one of the four columns, or uses `*` — rather than for
the fix's shape. 4 mutants, 4 killed.

### The client side of the same fix

The database change left two client-side residuals, and both are now closed.

`ListingMap.tsx` rendered the **Directions** link unconditionally, outside the
privacy branch, feeding coordinates to a Google Maps destination. After the
migration those are the snapped coordinates, so it no longer leaks the address
— but it would route a viewer up to ~393 m away and call that "Directions".
There is no honest route to a deliberately approximate point, so the control is
withheld when `hideExactAddress` is set.

The grid size and the drawn circle were related only by a comment: the SQL
carried a bare `0.005`, the component carried a bare `80` and `13`. Both now
come from `src/lib/listings/location-privacy.ts`, and
`src/__tests__/location-privacy-invariant.test.ts` (11 tests) parses the grid
literal out of the migration's **executable** lines, asserts it equals
`PRIVACY_GRID_DEG`, and evaluates the invariant

    gridHalfDiagonalMetres(lat) < approximateCircleRadiusMetres(lat)

at four Kenyan latitudes, requiring better than a 2x margin so the test fails
while there is still room to think. Measured at Nairobi: 19.104 m/px at zoom
13, a 393.5 m half-diagonal against a 1528.4 m drawn radius.

7 mutants, 7 killed: coarsening the SQL grid to 0.05, shrinking the circle to
8 px, zooming to 17, putting a bare literal back in the paint object, removing
the Directions guard, dropping the longitude snap, and making the divisor
differ from the multiplier.
