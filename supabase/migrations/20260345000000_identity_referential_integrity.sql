-- =============================================================================
-- Identity: close the unenforced identity references
-- =============================================================================
-- Fifteen uuid columns across thirteen tables named a person or an entity and
-- had NO foreign key at all. Found by sweeping pg_attribute for uuid columns
-- named user_id / customer_id / payer_id / reviewer_id / landlord_id /
-- provider_id / tenant_id or ending in _by, with no FK on that column.
--
-- THIS IS NOT THEORETICAL. notifications already holds ONE ROW whose user_id
-- (354a3f71-545a-474a-b6e2-a31dc445abd7) exists in neither profiles NOR
-- auth.users. The missing constraint has already admitted an orphan, which is
-- why notifications.user_id is added NOT VALID below -- see that entry.
--
-- The worst of the fifteen was service_providers.user_id: UNIQUE but
-- unconstrained, so 1:1 was enforced and the identity link was not. Since
-- profiles CASCADEs from auth.users and nothing linked the provider row, a
-- deleted user left their business profile behind -- and is_active defaults
-- true while providers_public_read_active keys on it, so that orphaned row
-- stayed PUBLICLY READABLE indefinitely.
--
-- ONE OF THE FIFTEEN IS NOT A PERSON
--
-- notifications.provider_id was caught by the sweep because of its name, but
-- twenty-one other tables already carry provider_id -> service_providers(id)
-- (api_keys, bookings, booking_payments, booking_quotes, provider_payouts,
-- reviews, saved_providers, ...). It is an ENTITY reference and the table's own
-- CHECK groups it with booking_id, review_id and entity_id. It targets
-- service_providers, not profiles. Pointing it at profiles because the sweep
-- found it would have been worse than leaving it unconstrained.
--
-- ON DELETE: A POLICY, NOT A DEFAULT
--
-- Each rule below is chosen, and the choice is constrained by nullability --
-- SET NULL is simply unavailable on a NOT NULL column, which is why four of
-- these are RESTRICT rather than anonymising the actor.
--
--   CASCADE   the row is the user's own and is meaningless without them
--   SET NULL  the record must outlive the actor, and the column is nullable
--   RESTRICT  the record must outlive the actor and the column is NOT NULL,
--             so the actor cannot be anonymised and the delete must be refused
--             rather than destroying the record
--
-- CONSEQUENCE, STATED PLAINLY: the four RESTRICTs mean a user who has written a
-- review, reported a dispute, uploaded booking media or changed a booking's
-- status CANNOT be hard-deleted. That is deliberate -- the alternative is
-- silently destroying a review, a dispute or an audit trail -- but it means
-- there is still no account-erasure path, and building one needs those four
-- columns made nullable so SET NULL becomes available. That is a retention and
-- privacy decision, not a schema cleanup, and it is NOT made here.
--
-- ROWS AFFECTED: 0 in twelve of the thirteen tables; 1 in notifications. Every
-- constraint below validates instantly against an empty table.
-- =============================================================================

-- =============================================================================
-- 1. CASCADE -- the row belongs to the user and dies with them
-- =============================================================================

-- The orphan-provider defect. CASCADE here is what stops a deleted user's
-- business profile remaining publicly listed.
ALTER TABLE public.service_providers
  DROP CONSTRAINT IF EXISTS service_providers_user_id_fkey;
ALTER TABLE public.service_providers
  ADD CONSTRAINT service_providers_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Had a primary key and nothing else: a preferences row could outlive its user
-- forever.
ALTER TABLE public.user_preferences
  DROP CONSTRAINT IF EXISTS user_preferences_user_id_fkey;
ALTER TABLE public.user_preferences
  ADD CONSTRAINT user_preferences_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- A saved address.
ALTER TABLE public.locations
  DROP CONSTRAINT IF EXISTS locations_user_id_fkey;
ALTER TABLE public.locations
  ADD CONSTRAINT locations_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- A vote is the voter's own act and carries no independent record value.
ALTER TABLE public.review_helpful_votes
  DROP CONSTRAINT IF EXISTS review_helpful_votes_user_id_fkey;
ALTER TABLE public.review_helpful_votes
  ADD CONSTRAINT review_helpful_votes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- NOT VALID, uniquely among these fifteen. One pre-existing row references a
-- user that exists in neither profiles nor auth.users, so a validating
-- constraint would be refused. NOT VALID enforces on every INSERT and UPDATE
-- from now on while leaving that row alone, so no NEW orphan can be created.
-- Deleting the existing one is a production record deletion and needs its own
-- authorization; once it is gone, run
--     ALTER TABLE public.notifications VALIDATE CONSTRAINT notifications_user_id_fkey;
-- The guard at the foot of this file reports the outstanding orphan count on
-- every apply, so this cannot quietly become permanent.
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE NOT VALID;

-- The entity reference, to service_providers -- see the header. The one
-- existing row has provider_id NULL, so this one validates.
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_provider_id_fkey;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_provider_id_fkey
  FOREIGN KEY (provider_id) REFERENCES public.service_providers(id) ON DELETE CASCADE;


-- =============================================================================
-- 2. SET NULL -- the record outlives the actor, and the column allows it
-- =============================================================================

-- An audit row whose actor is gone is still an audit row. Destroying the audit
-- trail because a user left is the opposite of what it is for.
ALTER TABLE public.audit_log
  DROP CONSTRAINT IF EXISTS audit_log_user_id_fkey;
ALTER TABLE public.audit_log
  ADD CONSTRAINT audit_log_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.booking_commitments
  DROP CONSTRAINT IF EXISTS booking_commitments_created_by_fkey;
ALTER TABLE public.booking_commitments
  ADD CONSTRAINT booking_commitments_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Admin actors: the decision stands, the reviewer's identity may lapse.
ALTER TABLE public.booking_disputes
  DROP CONSTRAINT IF EXISTS booking_disputes_resolved_by_fkey;
ALTER TABLE public.booking_disputes
  ADD CONSTRAINT booking_disputes_resolved_by_fkey
  FOREIGN KEY (resolved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.provider_services
  DROP CONSTRAINT IF EXISTS provider_services_verified_by_fkey;
ALTER TABLE public.provider_services
  ADD CONSTRAINT provider_services_verified_by_fkey
  FOREIGN KEY (verified_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.provider_verification_documents
  DROP CONSTRAINT IF EXISTS provider_verification_documents_reviewed_by_fkey;
ALTER TABLE public.provider_verification_documents
  ADD CONSTRAINT provider_verification_documents_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


-- =============================================================================
-- 3. RESTRICT -- NOT NULL, so the actor cannot be anonymised
-- =============================================================================
-- These four are why account erasure is still an open question. Each column is
-- NOT NULL, so SET NULL is not available; the choice is between refusing the
-- delete and destroying the record. Refusing is the conservative one.

-- A review is content other users rely on when choosing a provider, and it
-- feeds average_rating. reviews.provider_id already CASCADEs from
-- service_providers, so a provider leaving takes its reviews; a REVIEWER
-- leaving must not silently rewrite every provider's rating.
ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_reviewer_id_fkey;
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_reviewer_id_fkey
  FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

-- A dispute is a financial and potentially legal record.
ALTER TABLE public.booking_disputes
  DROP CONSTRAINT IF EXISTS booking_disputes_reported_by_fkey;
ALTER TABLE public.booking_disputes
  ADD CONSTRAINT booking_disputes_reported_by_fkey
  FOREIGN KEY (reported_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;

-- Booking media is evidence attached to a job, and to any dispute over it.
ALTER TABLE public.booking_media
  DROP CONSTRAINT IF EXISTS booking_media_uploaded_by_fkey;
ALTER TABLE public.booking_media
  ADD CONSTRAINT booking_media_uploaded_by_fkey
  FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;

-- The state-transition trail of a booking. Same argument as audit_log, but the
-- column is NOT NULL so SET NULL is unavailable.
ALTER TABLE public.booking_status_history
  DROP CONSTRAINT IF EXISTS booking_status_history_changed_by_fkey;
ALTER TABLE public.booking_status_history
  ADD CONSTRAINT booking_status_history_changed_by_fkey
  FOREIGN KEY (changed_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;


-- =============================================================================
-- 4. Indexes on the six FK columns that had none
-- =============================================================================
-- Postgres does not index a referencing column automatically. Without one,
-- every delete of a profile row scans the child table to enforce the rule --
-- for CASCADE and SET NULL as much as for RESTRICT. Nine of the fifteen
-- columns already had a leading index; these six did not.

CREATE INDEX IF NOT EXISTS idx_booking_commitments_created_by
  ON public.booking_commitments (created_by);
CREATE INDEX IF NOT EXISTS idx_booking_disputes_resolved_by
  ON public.booking_disputes (resolved_by);
CREATE INDEX IF NOT EXISTS idx_booking_status_history_changed_by
  ON public.booking_status_history (changed_by);
CREATE INDEX IF NOT EXISTS idx_notifications_provider_id
  ON public.notifications (provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_services_verified_by
  ON public.provider_services (verified_by);
CREATE INDEX IF NOT EXISTS idx_provider_verification_documents_reviewed_by
  ON public.provider_verification_documents (reviewed_by);


-- =============================================================================
-- GUARDS
-- =============================================================================

DO $$
DECLARE
  missing   text;
  wrong     text;
  orphans   int;
  n_fk      int;
BEGIN
  -- ---- every one of the fifteen now carries an FK ------------------------
  SELECT string_agg(x.tbl || '.' || x.col, ', ' ORDER BY x.tbl, x.col)
    INTO missing
    FROM (VALUES
      ('service_providers','user_id'),('user_preferences','user_id'),
      ('notifications','user_id'),('notifications','provider_id'),
      ('locations','user_id'),('review_helpful_votes','user_id'),
      ('reviews','reviewer_id'),('audit_log','user_id'),
      ('booking_commitments','created_by'),('booking_disputes','reported_by'),
      ('booking_disputes','resolved_by'),('booking_media','uploaded_by'),
      ('booking_status_history','changed_by'),('provider_services','verified_by'),
      ('provider_verification_documents','reviewed_by')
    ) AS x(tbl, col)
   WHERE NOT EXISTS (
     SELECT 1
       FROM pg_constraint con
       JOIN pg_attribute a ON a.attrelid = con.conrelid
                          AND a.attnum = ANY (con.conkey)
      WHERE con.conrelid = ('public.' || x.tbl)::regclass
        AND con.contype = 'f'
        AND a.attname = x.col
   );
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'identity columns still have no foreign key: %', missing;
  END IF;

  -- ---- the sweep is complete: NO uuid person-column is left unconstrained -
  -- Derived from the same predicate that found the fifteen, so this fails if a
  -- future table adds one. That is the point: a hand-kept list of fifteen is
  -- exactly what let these accumulate.
  SELECT string_agg(c.relname || '.' || a.attname, ', ' ORDER BY c.relname, a.attname)
    INTO wrong
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
   WHERE n.nspname = 'public' AND c.relkind = 'r'
     AND format_type(a.atttypid, a.atttypmod) = 'uuid'
     -- Deliberately the UNESCAPED '%_by': this is the exact predicate that
     -- found the fifteen, so the guard and the census cannot disagree about
     -- what counts. Unescaped '_' matches any character, which makes the
     -- guard broader than the census, never narrower.
     AND (a.attname IN ('user_id','customer_id','payer_id','reviewer_id',
                        'landlord_id','provider_id','tenant_id')
          OR a.attname LIKE '%_by')
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint con
        WHERE con.conrelid = c.oid AND con.contype = 'f'
          AND a.attnum = ANY (con.conkey));
  IF wrong IS NOT NULL THEN
    RAISE EXCEPTION 'uuid identity columns remain unconstrained: %', wrong;
  END IF;

  -- ---- notifications.provider_id points at the ENTITY, not at a person ---
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint con
      JOIN pg_class parent ON parent.oid = con.confrelid
     WHERE con.conrelid = 'public.notifications'::regclass
       AND con.conname = 'notifications_provider_id_fkey'
       AND parent.relname = 'service_providers'
  ) THEN
    RAISE EXCEPTION 'notifications.provider_id does not reference service_providers';
  END IF;

  -- ---- the orphan is still outstanding, and says so on every apply -------
  SELECT count(*) INTO orphans
    FROM public.notifications n
   WHERE n.user_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = n.user_id);

  IF orphans > 0 THEN
    RAISE WARNING
      'notifications still holds % orphaned user_id row(s); notifications_user_id_fkey '
      'remains NOT VALID. Delete them, then: ALTER TABLE public.notifications '
      'VALIDATE CONSTRAINT notifications_user_id_fkey;', orphans;
  ELSE
    RAISE NOTICE 'no orphans left in notifications -- the constraint can now be validated';
  END IF;

  -- ---- the six new indexes exist -----------------------------------------
  SELECT string_agg(x.idx, ', ' ORDER BY x.idx) INTO missing
    FROM (VALUES
      ('idx_booking_commitments_created_by'),
      ('idx_booking_disputes_resolved_by'),
      ('idx_booking_status_history_changed_by'),
      ('idx_notifications_provider_id'),
      ('idx_provider_services_verified_by'),
      ('idx_provider_verification_documents_reviewed_by')
    ) AS x(idx)
   WHERE NOT EXISTS (
     SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public' AND indexname = x.idx);
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'FK support indexes missing: %', missing;
  END IF;

  -- ---- and the inbound count on profiles grew by the fourteen ------------
  SELECT count(*) INTO n_fk
    FROM pg_constraint con
    JOIN pg_class parent ON parent.oid = con.confrelid
    JOIN pg_namespace pn ON pn.oid = parent.relnamespace
   WHERE con.contype = 'f' AND pn.nspname = 'public' AND parent.relname = 'profiles';
  IF n_fk < 32 THEN
    RAISE EXCEPTION 'profiles has only % inbound foreign keys; expected at least 32 (18 + 14)', n_fk;
  END IF;

  RAISE NOTICE 'identity_referential_integrity: all guards passed (% inbound FKs on profiles)', n_fk;
END
$$;


-- =============================================================================
-- DOWN
-- =============================================================================
-- Drop the fifteen constraints and the six indexes by name:
--
--   ALTER TABLE public.service_providers DROP CONSTRAINT IF EXISTS service_providers_user_id_fkey;
--   ... and so on for each constraint above ...
--   DROP INDEX IF EXISTS public.idx_booking_commitments_created_by;
--   ... and so on for each index above ...
--
-- Dropping a constraint cannot fail and loses no data, so this direction is
-- clean. What it restores, however, is the ability to create orphans -- which
-- notifications proves is not hypothetical.
-- =============================================================================
