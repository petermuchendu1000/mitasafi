-- =============================================================================
-- erase_account -- behavioural verification against a fully-populated account
-- =============================================================================
-- Covers 20260353000000_account_erasure.sql.
--
-- Run:  psql "$DATABASE_URL" -f supabase/tests/account_erasure_test.sql
-- A healthy run prints PASS on every line and ends with
--   ERASURE_RESULT pass=28 fail=0
--
-- WHY THIS SUITE IS LARGER THAN THE MIGRATION'S OWN GUARD
--
-- The migration's guard erases an account that has a profile, one role and one
-- saved address. That is enough to prove the function does something, and it
-- is all the fixture a migration should carry. It proves nothing about the part
-- that is actually hard: what happens to an account entangled with a SECOND
-- PERSON -- a booking the provider was paid for, a review the provider's rating
-- depends on, an enquiry a landlord is still holding.
--
-- So this builds the full chain: category -> service_type -> service ->
-- provider -> booking -> payment -> review -> dispute -> media, plus a landlord
-- with a listing and an enquiry against it, and then erases the customer.
--
-- The three questions it answers, which are the whole design:
--
--   E0-E8    is the erased person's own data gone, tombstoned, or provably frozen?
--   E9-E15   did the COUNTERPARTY keep everything they are entitled to?
--   E16-E19  are the financial records intact, PII included, as retained?
--
-- E12 is the one that would have caught a delete-based design: the provider's
-- booking must survive. E16 is the one that would catch an over-zealous one:
-- booking_payments.mpesa_phone is part of a financial record and must NOT be
-- scrubbed. Those two pull in opposite directions and both must hold.
--
-- The fixture builds its own category/service_type/service rather than reusing
-- seeded rows, so the suite behaves identically on a from-scratch local cluster
-- and on the live project.
--
-- Fixtures roll back via the terminal RAISE, like every suite here.
-- =============================================================================

DO $P$
DECLARE
  rep text := E'\n'; pass int := 0; fail int := 0;
  cust uuid := gen_random_uuid();
  prov uuid := gen_random_uuid();
  land uuid := gen_random_uuid();
  cat  uuid; styp uuid; svc uuid; pid uuid; bid uuid; lid uuid; loc uuid; loc2 uuid;
  r    jsonb;
  n    int;
  t    record;
  v_old_cust_email text := 'erase-cust@test.invalid';
BEGIN
  -- ===========================================================================
  -- FIXTURE: three people, fully entangled
  -- ===========================================================================
  INSERT INTO auth.users (id,email) VALUES
    (cust,v_old_cust_email),(prov,'erase-prov@test.invalid'),(land,'erase-land@test.invalid');
  INSERT INTO public.profiles (id,email,full_name,phone,metadata) VALUES
    (cust,v_old_cust_email,'Wanjiku Customer','+254711000001',
     jsonb_build_object('deletion_requested_at','2026-11-01T00:00:00Z','marketing_opt_in',true)),
    (prov,'erase-prov@test.invalid','Otieno Provider','+254711000002','{}'::jsonb),
    (land,'erase-land@test.invalid','Kamau Landlord','+254711000003','{}'::jsonb);

  INSERT INTO public.user_roles (user_id,role,is_active) VALUES
    (cust,'tenant',true),(prov,'service_provider',true),(land,'landlord',true);

  INSERT INTO public.service_categories (slug,name,display_order)
  VALUES ('erase-test-cat','Erase Test Category',9999) RETURNING id INTO cat;
  INSERT INTO public.service_types (code,name,booking_flow)
  VALUES ('erase_test_type','Erase Test Type','standard') RETURNING id INTO styp;
  INSERT INTO public.services (category_id,service_type_id,slug,name)
  VALUES (cat,styp,'erase-test-svc','Erase Test Service') RETURNING id INTO svc;

  INSERT INTO public.service_providers (user_id,business_name,phone,email,is_active,account_status)
  VALUES (prov,'Otieno Cleaning','+254711000002','erase-prov@test.invalid',true,'active')
  RETURNING id INTO pid;

  -- the customer's own data, which must disappear
  -- two addresses: one the booking will point at (RESTRICT, so it can only be
  -- scrubbed) and one nothing references (so it can be deleted).
  INSERT INTO public.locations (user_id,address_line1,access_notes)
  VALUES (cust,'12 Riverside Drive','Gate code 4455') RETURNING id INTO loc;
  INSERT INTO public.locations (user_id,address_line1)
  VALUES (cust,'Old flat, nothing points here') RETURNING id INTO loc2;
  -- phone_verifications_phone_digits_chk wants bare digits (no +), and
  -- phone_verifications_expiry_window_chk caps expires_at at created_at + 12m.
  INSERT INTO public.phone_verifications (user_id,phone,expires_at)
  VALUES (cust,'254711000001', now() + interval '5 minutes');
  INSERT INTO public.user_preferences (user_id) VALUES (cust);
  -- user_role and message are NOT NULL, and notification_has_entity requires
  -- an entity reference OR a type of system_announcement/account_update.
  INSERT INTO public.notifications (user_id,user_role,type,title,message)
  VALUES (cust,'tenant','account_update','A notification','Body text');

  -- the landlord's listing, the customer's enquiry against it, and a save
  INSERT INTO public.listings (landlord_id,title,description,property_type,address,area,
                               rent_amount,status)
  VALUES (land,'2BR Kilimani','Nice place','apartment','7 Dennis Pritt Rd','Kilimani',85000,'active')
  RETURNING id INTO lid;
  INSERT INTO public.saved_listings (user_id,listing_id) VALUES (cust,lid);
  INSERT INTO public.inquiries (listing_id,landlord_id,user_id,name,phone,email,message)
  VALUES (lid,land,cust,'Wanjiku Customer','+254711000001',v_old_cust_email,
          'Is this still available?');

  -- the job, the money, and the review
  -- Deliberately 'submitted', not 'completed'. enforce_booking_state_machine
  -- refuses to CREATE a booking in any state but draft/submitted, and reaching
  -- 'completed' means walking the whole lifecycle with pricing_snapshot and
  -- agreed_price at the right steps. None of that is what this suite tests:
  -- erasure does not read bookings.status, and a booking with a payment, a
  -- review, a dispute and media proves the retention question just as well in
  -- any state. pricing_snapshot and agreed_price are supplied anyway so the
  -- row is realistic.
  INSERT INTO public.bookings (customer_id,provider_id,service_id,service_type_id,
                               booking_flow_type,status,service_location_id,customer_notes,
                               estimated_duration_minutes,pricing_snapshot,agreed_price)
  VALUES (cust,pid,svc,styp,'standard','submitted',loc,'Gate code is 1234',
          120,'{"source":"suite"}'::jsonb,3500)
  RETURNING id INTO bid;
  -- booking_payments_amount_split_check: amount = platform_fee + provider_amount.
  -- platform_fee defaults to 0, so leaving it out violates the split.
  INSERT INTO public.booking_payments (booking_id,payer_id,provider_id,amount,platform_fee,
                                       provider_amount,mpesa_phone,mpesa_receipt_number)
  VALUES (bid,cust,pid,3500,350,3150,'254711000001','QK12AB34CD');
  INSERT INTO public.reviews (booking_id,reviewer_id,provider_id,service_id,rating,review_text)
  VALUES (bid,cust,pid,svc,'5'::public.review_rating,'Excellent work, very thorough');
  INSERT INTO public.booking_disputes (booking_id,reported_by,reported_by_role,dispute_type,description)
  VALUES (bid,cust,'customer','quality','Minor issue with the finish');
  INSERT INTO public.booking_media (booking_id,uploaded_by,uploaded_by_role,media_type,media_url,stage)
  VALUES (bid,cust,'customer','photo','https://example.invalid/a.jpg','before');

  -- ===========================================================================
  -- PREMISE: a hard DELETE is impossible. The design rests on this.
  -- ===========================================================================
  BEGIN
    DELETE FROM public.profiles WHERE id = cust;
    fail:=fail+1; rep:=rep||'FAIL E0 a hard DELETE of an entangled profile SUCCEEDED -- '
      ||'the RESTRICT constraints are gone and this design''s premise is false'||E'\n';
  EXCEPTION WHEN foreign_key_violation THEN
    pass:=pass+1; rep:=rep||'PASS E0 a hard DELETE is blocked by RESTRICT (23503)'||E'\n';
  END;

  -- ===========================================================================
  -- ERASE
  -- ===========================================================================
  r := public.erase_account(cust, 'suite: data subject request 2026-11-01');

  -- ---- the erased person's own data ----------------------------------------
  SELECT email, full_name, phone, avatar_url, verification_level, metadata INTO t
    FROM public.profiles WHERE id = cust;

  IF t.full_name = 'Erased account' AND t.phone IS NULL AND t.avatar_url IS NULL THEN
    pass:=pass+1; rep:=rep||'PASS E1 name and phone tombstoned'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL E1 profile not tombstoned: name='||coalesce(t.full_name,'NULL')
    ||' phone='||coalesce(t.phone,'NULL')||E'\n'; END IF;

  IF t.email <> v_old_cust_email AND t.email LIKE 'erased-%@erased.invalid' THEN
    pass:=pass+1; rep:=rep||'PASS E2 email replaced with a tombstone'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL E2 email is '||coalesce(t.email,'NULL')||E'\n'; END IF;

  IF NOT (t.metadata ? 'marketing_opt_in') THEN
    pass:=pass+1; rep:=rep||'PASS E3 metadata replaced, not merged'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL E3 client-written metadata survived erasure'||E'\n'; END IF;

  IF t.metadata->>'deletion_requested_at' = '2026-11-01T00:00:00Z'
     AND (t.metadata->>'erased_at') IS NOT NULL THEN
    pass:=pass+1; rep:=rep||'PASS E4 the request date and the erasure date are both recorded'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL E4 metadata lost the audit dates: '||t.metadata::text||E'\n'; END IF;

  SELECT count(*) INTO n FROM (
    SELECT 1 FROM public.phone_verifications WHERE user_id = cust
    UNION ALL SELECT 1 FROM public.user_preferences WHERE user_id = cust
    UNION ALL SELECT 1 FROM public.notifications    WHERE user_id = cust
    UNION ALL SELECT 1 FROM public.saved_listings   WHERE user_id = cust
  ) x;
  IF n = 0 THEN pass:=pass+1; rep:=rep||'PASS E5 own-only rows deleted (phone_verifications, '
    ||'preferences, notifications, saves)'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL E5 '||n||' own-only rows survived erasure'||E'\n'; END IF;

  -- locations is the exception, twice over. bookings.service_location_id is
  -- RESTRICT so the row cannot be deleted, and
  -- prevent_location_address_mutation() freezes every address field on a booked
  -- location so it cannot be scrubbed either. What erasure CAN clear is
  -- access_notes -- gate codes and caretaker contacts, per that trigger's own
  -- comment. Both halves asserted, because clearing the notes while silently
  -- failing to keep the address, or vice versa, are different bugs.
  SELECT address_line1, access_notes INTO t FROM public.locations WHERE id = loc;
  IF t.access_notes IS NULL THEN
    pass:=pass+1; rep:=rep||'PASS E5b a booked location loses its access notes (gate codes)'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL E5b the gate code survived erasure: '||t.access_notes||E'\n'; END IF;

  IF t.address_line1 = '12 Riverside Drive' THEN
    pass:=pass+1; rep:=rep||'PASS E5d the booked address is retained, frozen as dispute evidence'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL E5d the booked address changed to '
    ||coalesce(t.address_line1,'(deleted)')||' -- prevent_location_address_mutation '
    ||'should have made that impossible'||E'\n'; END IF;

  -- and an address nothing points at is removed outright
  IF NOT EXISTS (SELECT 1 FROM public.locations WHERE id = loc2) THEN
    pass:=pass+1; rep:=rep||'PASS E5c an unreferenced location is deleted outright'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL E5c an unreferenced location survived'||E'\n'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = cust AND is_active) THEN
    pass:=pass+1; rep:=rep||'PASS E6 every role deactivated'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL E6 a role is still active'||E'\n'; END IF;

  -- 20260352's trigger derives primary_role from active roles, so deactivating
  -- them must have reset it without erase_account touching the column.
  SELECT primary_role INTO t FROM public.profiles WHERE id = cust;
  IF t.primary_role IS NULL THEN
    pass:=pass+1; rep:=rep||'PASS E7 primary_role followed the roles down to NULL'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL E7 primary_role is still '||t.primary_role||E'\n'; END IF;

  IF (SELECT email FROM auth.users WHERE id = cust) <> v_old_cust_email THEN
    pass:=pass+1; rep:=rep||'PASS E8 auth.users.email scrubbed (the login identifier)'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL E8 auth.users still holds the real email -- the person can '
    ||'still be identified and still sign in'||E'\n'; END IF;

  -- ===========================================================================
  -- THE COUNTERPARTY KEEPS WHAT THEY ARE ENTITLED TO
  -- ===========================================================================
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = cust) THEN
    pass:=pass+1; rep:=rep||'PASS E9 the profile row survives as the anchor for 38 foreign keys'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL E9 the profile row was deleted'||E'\n'; END IF;

  SELECT status INTO t FROM public.listings WHERE id = lid;
  IF t.status = 'active' THEN
    pass:=pass+1; rep:=rep||'PASS E10 the landlord''s listing survives, still active'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL E10 erasing a customer changed the landlord''s listing to '
    ||coalesce(t.status,'(gone)')||E'\n'; END IF;

  SELECT name, phone, email, message INTO t FROM public.inquiries WHERE user_id = cust;
  IF t.name = 'Erased account' AND t.email IS NULL AND t.phone = '+000000000000' THEN
    pass:=pass+1; rep:=rep||'PASS E11 the enquiry survives with its contact details scrubbed'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL E11 enquiry contact data not scrubbed: name='||coalesce(t.name,'NULL')
    ||' phone='||coalesce(t.phone,'NULL')||' email='||coalesce(t.email,'NULL')||E'\n'; END IF;

  IF EXISTS (SELECT 1 FROM public.bookings WHERE id = bid) THEN
    pass:=pass+1; rep:=rep||'PASS E12 the provider keeps the booking they were paid for'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL E12 the provider''s booking was destroyed -- bookings.customer_id '
    ||'is CASCADE and something deleted the profile'||E'\n'; END IF;

  IF EXISTS (SELECT 1 FROM public.reviews WHERE booking_id = bid AND reviewer_id = cust) THEN
    pass:=pass+1; rep:=rep||'PASS E13 the review survives, now authored by a tombstone'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL E13 the review was destroyed -- the provider''s rating changed '
    ||'because someone else erased their account'||E'\n'; END IF;

  IF EXISTS (SELECT 1 FROM public.booking_disputes WHERE booking_id = bid)
     AND EXISTS (SELECT 1 FROM public.booking_media WHERE booking_id = bid) THEN
    pass:=pass+1; rep:=rep||'PASS E14 the dispute record and its evidence survive'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL E14 dispute or evidence lost'||E'\n'; END IF;

  SELECT full_name INTO t FROM public.profiles WHERE id = prov;
  IF t.full_name = 'Otieno Provider' THEN
    pass:=pass+1; rep:=rep||'PASS E15 the provider''s own profile is untouched'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL E15 erasing the customer altered the provider: '
    ||coalesce(t.full_name,'NULL')||E'\n'; END IF;

  -- ===========================================================================
  -- FINANCIAL RECORDS ARE RETAINED, PII INCLUDED, BY DESIGN
  -- ===========================================================================
  SELECT amount, mpesa_phone, mpesa_receipt_number INTO t
    FROM public.booking_payments WHERE booking_id = bid;
  IF t.amount = 3500 AND t.mpesa_receipt_number = 'QK12AB34CD' THEN
    pass:=pass+1; rep:=rep||'PASS E16 the payment record is intact'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL E16 the payment record was altered or removed'||E'\n'; END IF;

  -- Deliberately asserting that PII in a financial record SURVIVES. If this
  -- ever starts failing, someone has decided to scrub it, and that is a
  -- compliance decision that must be made explicitly -- not a test to relax.
  IF t.mpesa_phone = '254711000001' THEN
    pass:=pass+1; rep:=rep||'PASS E17 mpesa_phone retained -- a receipt that cannot be reconciled '
      ||'against a statement is not a record'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL E17 mpesa_phone was scrubbed: the retention decision in the '
    ||'migration header and the code now disagree'||E'\n'; END IF;

  IF (r->'retained'->>'booking_payments')::int = 1
     AND (r->'retained'->>'reviews')::int = 1
     AND (r->'retained'->>'bookings')::int = 1 THEN
    pass:=pass+1; rep:=rep||'PASS E18 the return value reports what was retained'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL E18 retained counts wrong: '||(r->'retained')::text||E'\n'; END IF;

  IF (r->'deleted'->>'locations')::int = 1
     AND (r->'deleted'->>'location_access_notes_cleared')::int = 1
     AND (r->'retained'->>'booked_addresses_frozen')::int = 1
     AND (r->'deleted'->>'notifications')::int = 1 THEN
    pass:=pass+1; rep:=rep||'PASS E19 the return value reports what was deleted'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL E19 deleted counts wrong: '||(r->'deleted')::text||E'\n'; END IF;

  -- ===========================================================================
  -- AUDIT, IDEMPOTENCE, AND ACCESS
  -- ===========================================================================
  SELECT details INTO t FROM public.audit_log
   WHERE action = 'account_erased' AND entity_id = cust;
  IF t.details->>'reason' = 'suite: data subject request 2026-11-01'
     AND t.details::text NOT LIKE '%Wanjiku%'
     AND t.details::text NOT LIKE '%'||v_old_cust_email||'%' THEN
    pass:=pass+1; rep:=rep||'PASS E20 an audit row exists and contains NO erased personal data'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL E20 the audit row is missing or preserved the data that was '
    ||'erased: '||coalesce(t.details::text,'NULL')||E'\n'; END IF;

  r := public.erase_account(cust, 'suite: second call');
  IF (r->>'already_erased')::boolean IS TRUE THEN
    pass:=pass+1; rep:=rep||'PASS E21 a second erasure is a no-op reporting already_erased'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL E21 a second erasure re-ran and overwrote erased_at'||E'\n'; END IF;

  -- Without this, everything above describes a way for any signed-in user to
  -- erase anybody.
  PERFORM set_config('request.jwt.claim.sub', prov::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM public.erase_account(land, 'suite: client erasing someone else');
    RESET ROLE; fail:=fail+1; rep:=rep||'FAIL E22 an authenticated client erased another account'||E'\n';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE; pass:=pass+1; rep:=rep||'PASS E22 a client cannot execute erase_account'||E'\n'; END;

  -- ===========================================================================
  -- ERASING A LANDLORD MUST TAKE THEIR LISTINGS OFF THE MARKET
  -- ===========================================================================
  -- The other half of the design: a customer's erasure must not touch the
  -- listing, and the landlord's must. Both branches, same suite.
  r := public.erase_account(land, 'suite: landlord erasure');
  SELECT status INTO t FROM public.listings WHERE id = lid;
  IF t.status = 'archived' THEN
    pass:=pass+1; rep:=rep||'PASS E23 erasing the landlord archived their listing'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL E23 an erased landlord''s listing is still '
    ||coalesce(t.status,'(gone)')||' -- their address is still published'||E'\n'; END IF;

  IF (r->'flagged'->>'listings_archived')::int = 1 THEN
    pass:=pass+1; rep:=rep||'PASS E24 the return value reports the archived listing count'||E'\n';
  ELSE fail:=fail+1; rep:=rep||'FAIL E24 listings_archived not reported: '||(r->'flagged')::text||E'\n'; END IF;

  PERFORM set_config('request.jwt.claim.sub','',true);

  RAISE EXCEPTION E'ERASURE_RESULT pass=% fail=%\n%', pass, fail, rep;
END
$P$;
