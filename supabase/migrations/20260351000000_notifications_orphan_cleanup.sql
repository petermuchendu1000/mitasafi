-- =============================================================================
-- Remove the one orphaned notification, then validate the constraint
-- =============================================================================
-- 20260345000000_identity_referential_integrity.sql added
--
--   notifications_user_id_fkey FOREIGN KEY (user_id)
--     REFERENCES profiles(id) ON DELETE CASCADE NOT VALID
--
-- NOT VALID because one row already violated it. A NOT VALID foreign key is
-- enforced on new and modified rows but skips the existing ones, so the table
-- has been correct going forward and wrong historically -- and, importantly,
-- the planner will not use a NOT VALID constraint for reasoning, and nothing
-- stops the violation count growing if the constraint is ever dropped and
-- re-added from this state.
--
-- MEASURED, at the time this migration was written:
--
--   notifications holds 1 row in total, and it is the orphan:
--     id         69beeac2-3553-46c3-a153-9b0f1377abc0
--     user_id    354a3f71-545a-474a-b6e2-a31dc445abd7
--     type       new_inquiry
--     created_at 2026-11-07
--   That user_id has NO profiles row and NO auth.users row -- the account was
--   removed at some point and the notification outlived it.
--
-- So this is a notification addressed to nobody. It cannot be delivered, it
-- cannot be read (the SELECT policy is keyed on auth.uid() = user_id and no
-- session can ever present that uid), and it cannot be repaired -- there is no
-- user to re-point it at. Deleting it is the only available action, and it is
-- what ON DELETE CASCADE would have done had the constraint existed when the
-- account was removed.
--
-- WHY THE DELETE IS WRITTEN AS A PREDICATE AND NOT AS THAT ID
--
-- Deleting `WHERE id = '69beeac2-...'` would be a one-shot statement that does
-- nothing on a database where the orphan has a different id -- a fresh local
-- cluster, a staging project, a restored backup. The predicate deletes
-- whatever is actually orphaned, which is the thing this migration is for, and
-- it is also why the migration is safe to replay: after the first run there is
-- nothing left to match.
--
-- The guard below reports the count so the apply log says what it removed
-- rather than leaving it to be inferred.
-- =============================================================================

DO $$
DECLARE
  n_orphans int;
  n_total   int;
BEGIN
  SELECT count(*) INTO n_total FROM public.notifications;
  SELECT count(*) INTO n_orphans
    FROM public.notifications n
   WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = n.user_id);

  RAISE NOTICE 'notifications: % rows, % orphaned', n_total, n_orphans;

  -- A sanity bound, not a correctness check. If a future run of this migration
  -- found a large number of orphans it would mean something had gone wrong with
  -- profile deletion -- the CASCADE stopped working, or rows were loaded around
  -- it -- and silently deleting them in bulk is not the right response to that.
  -- The measured value is 1.
  IF n_orphans > 10 THEN
    RAISE EXCEPTION 'refusing to bulk-delete % orphaned notifications. The '
      'CASCADE should prevent orphans; this many means something else is '
      'creating them, and that should be understood before they are removed.',
      n_orphans;
  END IF;
END
$$;

DELETE FROM public.notifications n
 WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = n.user_id);

-- Now that no row violates it, the constraint can carry its full meaning.
-- VALIDATE CONSTRAINT takes only a SHARE UPDATE EXCLUSIVE lock, so it does not
-- block reads or writes; it scans the table once.
ALTER TABLE public.notifications VALIDATE CONSTRAINT notifications_user_id_fkey;


-- =============================================================================
-- GUARDS
-- =============================================================================

DO $$
DECLARE
  n int;
  v boolean;
BEGIN
  -- ---- no orphan survives --------------------------------------------------
  SELECT count(*) INTO n
    FROM public.notifications n2
   WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = n2.user_id);
  IF n <> 0 THEN
    RAISE EXCEPTION '% orphaned notifications remain after the delete', n;
  END IF;

  -- ---- and the constraint is now validated ---------------------------------
  -- This is the point of the migration. The delete alone would leave the
  -- constraint NOT VALID, which means Postgres still treats the table as
  -- possibly containing violations.
  SELECT convalidated INTO v
    FROM pg_constraint
   WHERE conrelid = 'public.notifications'::regclass
     AND conname = 'notifications_user_id_fkey';
  IF v IS NULL THEN
    RAISE EXCEPTION 'notifications_user_id_fkey is missing';
  END IF;
  IF NOT v THEN
    RAISE EXCEPTION 'notifications_user_id_fkey is still NOT VALID';
  END IF;

  -- ---- the delete rule is unchanged ---------------------------------------
  -- CASCADE is what makes future orphans impossible. A migration that
  -- validated the constraint while weakening its action would close this
  -- instance and leave the cause.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.notifications'::regclass
       AND conname = 'notifications_user_id_fkey'
       AND confdeltype = 'c'          -- 'c' = CASCADE
  ) THEN
    RAISE EXCEPTION 'notifications_user_id_fkey is no longer ON DELETE CASCADE, so '
      'deleting a profile can orphan notifications again';
  END IF;

  RAISE NOTICE 'notifications_orphan_cleanup: constraint validated, CASCADE intact';
END
$$;


-- =============================================================================
-- DOWN
-- =============================================================================
-- The deleted row cannot be restored -- it referenced a user that no longer
-- exists, so even re-inserting it would immediately violate the constraint.
-- Only the validation is reversible:
--
--   ALTER TABLE public.notifications
--     DROP CONSTRAINT notifications_user_id_fkey;
--   ALTER TABLE public.notifications
--     ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id)
--     REFERENCES public.profiles(id) ON DELETE CASCADE NOT VALID;
--
-- There is no reason to do that. NOT VALID was a concession to one bad row.
-- =============================================================================
