# Vacancy Verification Architecture
**Date:** October 22, 2026
**Depends on:** `HOUSE_HUNTING_SOCIAL_RESEARCH_KENYA.md`, `CARETAKER_AGENT_INCENTIVE_DESIGN.md`
**Status:** DESIGN — proposed DDL, not yet landed as a migration
**Solves:** "Who presses TAKEN?" — the failure that killed every platform in the research report

---

## 0. The One-Sentence Thesis

> **Never store a vacancy status. Store who said what, when, and from where — then derive
> the status, and let it expire.**

Every dead portal in the research report (§6) had a status column somebody owned and nobody
maintained. `public.units.status` in this repo is that column today:

```sql
status TEXT DEFAULT 'vacant' CHECK (status IN ('vacant','occupied','maintenance','reserved'))
```

One writer. No history. No provenance. No confidence. No expiry. It is correct for landlord
self-management and **structurally incapable** of being the public truth, because the person
who knows it changed has no reason to log in.

**This design does not replace it.** `units.status` remains the landlord's own record.
Alongside it we add an append-only observation ledger and a derived, decaying,
confidence-scored public state.

---

## 1. Three Layers

| Layer | Table(s) | Mutability | Owner |
|---|---|---|---|
| **1. Assertion** | `units.status` (existing), `listings.status` (existing) | Mutable | The landlord, for their own books |
| **2. Observation** | `unit_observations` | **APPEND-ONLY. Never UPDATE, never DELETE.** | Anyone authorised, forever auditable |
| **3. Derived state** | `vacancy_states` | Written **only** by a `SECURITY DEFINER` function | The system. No human may write it. |

The public app reads **layer 3 only**. Nothing in the tenant-facing product ever reads a
raw status column.

---

## 2. Entity Resolution — the problem nobody plans for

A connector reports "bedsitter, 10k, Pipeline, behind Naivas." We may have no building, no
unit, no landlord for it. Three days later somebody else reports the same house.

So observations cannot hang off `units.id` — most early inventory will not be a managed
unit. We need a stable identity for *a rentable thing in the real world*, which may later
resolve to a managed unit, and which must be **mergeable**.

```sql
-- =============================================================================
-- TABLE: vacancy_subjects
-- Purpose: Stable identity for a rentable thing, managed or not. Observations
--          attach here, never directly to units.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.vacancy_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Resolution to managed records. All nullable: most subjects start unmanaged.
  unit_id     UUID REFERENCES public.units(id)     ON DELETE SET NULL,
  listing_id  UUID REFERENCES public.listings(id)  ON DELETE SET NULL,
  building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,

  -- Identity for unmanaged subjects (what the reporter could actually tell us)
  claimed_building_name TEXT,
  claimed_unit_label    TEXT,          -- "House 4", "Door 12", "upstairs left"
  claimed_unit_type     TEXT CHECK (claimed_unit_type IN (
    'single_room','bedsitter','studio','1br','2br','3br','4br_plus','house','other'
  )),
  claimed_rent          DECIMAL(10,2),

  -- Geography. Ward FK intentionally loose: use the repo's wards dataset.
  area        TEXT,
  ward_code   TEXT,
  latitude    DECIMAL(10,8),
  longitude   DECIMAL(11,8),
  geo_accuracy_m INTEGER,

  -- Dedupe / merge
  merged_into_id UUID REFERENCES public.vacancy_subjects(id) ON DELETE SET NULL,
  merge_reason   TEXT,
  merged_at      TIMESTAMPTZ,
  merged_by      UUID REFERENCES public.profiles(id),

  -- Lifecycle
  resolution_status TEXT NOT NULL DEFAULT 'unmanaged' CHECK (resolution_status IN (
    'unmanaged',        -- exists only as a claim
    'matched',          -- linked to a unit/listing, not yet landlord-confirmed
    'confirmed',        -- landlord confirmed this is their unit
    'merged',           -- folded into another subject
    'rejected'          -- does not exist / duplicate / fabricated
  )),

  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    UUID REFERENCES public.profiles(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT merged_has_target CHECK (
    resolution_status <> 'merged' OR merged_into_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_vacancy_subjects_unit     ON public.vacancy_subjects(unit_id)     WHERE unit_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vacancy_subjects_building ON public.vacancy_subjects(building_id) WHERE building_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vacancy_subjects_ward     ON public.vacancy_subjects(ward_code);
CREATE INDEX IF NOT EXISTS idx_vacancy_subjects_live     ON public.vacancy_subjects(resolution_status)
  WHERE merged_into_id IS NULL;
-- Geo dedupe probe
CREATE INDEX IF NOT EXISTS idx_vacancy_subjects_latlng   ON public.vacancy_subjects(latitude, longitude)
  WHERE latitude IS NOT NULL AND merged_into_id IS NULL;

COMMENT ON TABLE public.vacancy_subjects IS
  'Stable identity for a rentable thing in the real world. Observations attach here, not to units, because most early inventory is not a managed unit.';
```

**Merge rule:** candidate duplicates are subjects within **40 m**, same `claimed_unit_type`,
rent within **±15%**, not already merged. A machine proposes; **a Level 2+ observer or admin
confirms.** Never auto-merge — a wrong merge destroys two histories at once and is far more
expensive than a duplicate.

---

## 3. The Observation Ledger

The heart of the system. **Append-only.** No `UPDATE`, no `DELETE`, enforced by trigger.

```sql
-- =============================================================================
-- TABLE: unit_observations
-- Purpose: Append-only ledger of claims about a subject's state.
--          THIS TABLE IS NEVER UPDATED OR DELETED. Outcomes live in a side table.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.unit_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.vacancy_subjects(id) ON DELETE RESTRICT,

  observer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,

  -- What is being claimed
  claim TEXT NOT NULL CHECK (claim IN (
    'vacant',           -- free now
    'vacant_from',      -- will be free on a date (the outgoing-tenant signal)
    'taken',            -- someone has it
    'withdrawn',        -- landlord pulled it off the market
    'not_a_unit',       -- does not exist / fabricated
    'price_changed',
    'details_changed'
  )),
  vacant_from_date DATE,              -- required when claim = 'vacant_from'
  claimed_rent DECIMAL(10,2),
  note TEXT,

  -- WHO they were AT THE TIME. Frozen on insert. Never recomputed.
  observer_tier       SMALLINT NOT NULL CHECK (observer_tier BETWEEN 0 AND 4),
  standing_weight     NUMERIC(4,3) NOT NULL CHECK (standing_weight BETWEEN 0 AND 1),
  track_record_weight NUMERIC(4,3) NOT NULL CHECK (track_record_weight BETWEEN 0 AND 1),
  proximity_weight    NUMERIC(4,3) NOT NULL CHECK (proximity_weight BETWEEN 0 AND 1),
  effective_weight    NUMERIC(5,4) NOT NULL,   -- product of the three, frozen

  -- Provenance / anti-fraud
  captured_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL CHECK (source IN ('app','ussd','whatsapp','web','admin','import','system')),
  latitude  DECIMAL(10,8),
  longitude DECIMAL(11,8),
  geo_accuracy_m INTEGER,
  distance_from_subject_m INTEGER,     -- computed at insert
  device_fingerprint TEXT,
  ip_hash TEXT,                        -- hashed, never raw IP

  -- Independence clustering (collusion defence, computed at insert)
  independence_key TEXT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT vacant_from_needs_date CHECK (
    claim <> 'vacant_from' OR vacant_from_date IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_observations_subject_time ON public.unit_observations(subject_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_observations_observer     ON public.unit_observations(observer_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_observations_independence ON public.unit_observations(subject_id, independence_key);
CREATE INDEX IF NOT EXISTS idx_observations_device       ON public.unit_observations(device_fingerprint)
  WHERE device_fingerprint IS NOT NULL;

-- Hard immutability
CREATE OR REPLACE FUNCTION public.reject_observation_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'unit_observations is append-only (attempted %)', TG_OP;
END; $$;

CREATE TRIGGER trg_observations_no_update BEFORE UPDATE ON public.unit_observations
  FOR EACH ROW EXECUTE FUNCTION public.reject_observation_mutation();
CREATE TRIGGER trg_observations_no_delete BEFORE DELETE ON public.unit_observations
  FOR EACH ROW EXECUTE FUNCTION public.reject_observation_mutation();

COMMENT ON COLUMN public.unit_observations.effective_weight IS
  'Frozen at insert. Do NOT recompute when the observer''s track record later changes — that would rewrite history and make confidence non-reproducible.';
COMMENT ON COLUMN public.unit_observations.independence_key IS
  'Collapses correlated observations. Observations sharing a key count ONCE in confidence maths.';
```

### Why weights are frozen at insert
If an observer's accuracy improves next month and we recomputed old weights, the confidence
of every past state would silently change and **no decision would be reproducible.** Freeze
the weight; let the new weight apply to new observations only.

---

## 4. Trust Weights — three dimensions, not one score

A single "reputation number" is the standard mistake: it conflates *what role you hold*,
*how reliable you have proven*, and *whether you were plausibly there*.

```
effective_weight = standing × track_record × proximity
```

### 4.1 Standing (role prior, from the incentive doc's ladder)

| Tier | Role | Standing for subject in own building | Outside it |
|---|---|---|---|
| 4 | Registered agent (EARB), managing this building | 0.95 | 0.40 |
| — | Landlord of record | **1.00** | 0.10 |
| 3 | Scout / estate operator, building in portfolio | 0.80 | 0.35 |
| 2 | Verified caretaker, landlord-confirmed for building | **0.90** | 0.20 |
| 1 | Verified resident of the building | 0.60 | 0.15 |
| 1 | Outgoing tenant, for **their own unit** | **0.95** | — |
| 1 | Incoming tenant confirming move-in | **0.95** | — |
| 0 | Connector (ID-verified, no building tie) | 0.25 | 0.25 |
| 0 | Anonymous / unverified | 0.10 | 0.10 |

Note the two 0.95s at tier 1. **The outgoing and incoming tenant are near-authoritative about
their own unit** — they are the only people with no incentive to lie about it. This is the
research report's central insight expressed as a number.

### 4.2 Track record (earned) — Wilson lower bound, not raw percentage

```sql
-- Wilson score lower bound at ~95% confidence.
-- Raw accuracy is unusable: 3/3 would outrank 140/145.
CREATE OR REPLACE FUNCTION public.wilson_lower_bound(successes INT, total INT)
RETURNS NUMERIC LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN total = 0 THEN 0.50::NUMERIC   -- neutral prior for newcomers
  ELSE
    GREATEST(0::NUMERIC, LEAST(1::NUMERIC,
      ( (successes::NUMERIC / total) + 1.9208 / (2 * total)
        - 1.96 * SQRT( (successes::NUMERIC * (total - successes)::NUMERIC) / total + 0.9604 ) / total
      ) / (1 + 3.8416 / total)
    ))
  END;
$$;
```

New observers start at **0.50** — trusted enough to be useful, not enough to move a state
alone. Earning the right to be believed takes about 20 scored observations.

### 4.3 Proximity / plausibility (per-observation)

| Condition | Factor |
|---|---|
| Live in-app photo, geo within 50 m of subject | **1.00** |
| Geo within 50 m, no photo | 0.90 |
| Geo 50–250 m | 0.70 |
| Geo > 250 m, or absent | 0.45 |
| Claims vacant for a building they have no relationship to | 0.35 |
| USSD / WhatsApp (no geo possible) but observer is tier 2+ for the building | 0.85 |

The USSD row matters: if the survey (`CARETAKER_FIELD_SURVEY.md` F1) shows mostly feature
phones, we cannot demand geotagged photos. A confirmed caretaker on USSD must still be able
to earn near-full weight for his own building.

---

## 5. Confidence Maths

### 5.1 Decay — the core mechanism

**Vacancy is perishable. Occupancy is durable.** That asymmetry is the whole engine.

| Claim | Half-life |
|---|---|
| `vacant` | **`clamp(30 / monthly_moveouts, 3, 14)` days** — baseline 7 |
| `vacant_from` | Until the date, then becomes a `vacant` claim with fresh decay |
| `taken` | **60 days** (leases run 12 months; occupancy persists) |
| `withdrawn` | 90 days |
| `not_a_unit` | 365 days |

The `vacant` half-life scales with **building turnover** — `monthly_moveouts` is question C4
in the caretaker survey. A high-churn Pipeline block decays in 3 days; a quiet Ruaka block
takes 14. Same code, locally tuned.

```
weighted_score(claim) = Σ over INDEPENDENT observations o of that claim:
                          o.effective_weight × 0.5 ^ ( age_days(o) / halflife(claim) )
```

Independence: group by `independence_key`, take **MAX** within each group, not SUM. Two taps
from the same phone are one observation.

```
confidence(claim) = weighted_score(claim)
                    / ( weighted_score(claim) + weighted_score(opposing) + K )
```

with **K = 0.8** as prior strength, so a single observation cannot reach certainty. One
caretaker (0.90 × 0.50 × 1.00 = 0.45) yields confidence ≈ 0.36 — useful, not publishable.
Two independent caretakers reach ≈ 0.53. A caretaker plus the outgoing tenant reaches ≈ 0.62.

### 5.2 Asymmetric publication thresholds

**This is the most important product decision in the document.**

The two errors do not cost the same:

- A false **"vacant"** makes a person spend fare and half a day on a house that is gone.
  That is the exact injury that destroyed trust in every existing platform.
- A false **"taken"** costs us one listing, which the next observation re-opens.

So the thresholds are deliberately unequal:

| Transition | Requirement |
|---|---|
| → **`vacant`** (publish as available) | `confidence(vacant) ≥ 0.75` **AND** `weighted_score(vacant) ≥ 1.2` |
| → **`taken`** | `confidence(taken) ≥ 0.45` **OR** any single observation with `effective_weight ≥ 0.85` claims taken |
| → **`unknown`** | neither threshold met |

Note the absolute floor (`≥ 1.2`) on publishing vacancy. A ratio alone is gameable by
suppressing opposing evidence; an absolute evidence floor is not. **Publishing "available"
requires real corroborated weight — roughly a caretaker with a track record plus one more
independent voice.**

A landlord or the outgoing tenant saying "taken" (weight ≥ 0.85) closes it **instantly, on
one observation.** Truth about disappearance should travel with no friction at all.

### 5.3 Hysteresis — stop the flapping

Entry and exit bands differ, or a subject oscillates on noise:

- Published `vacant` stays `vacant` until `confidence(vacant) < 0.60`
- Published `taken` stays `taken` until `confidence(taken) < 0.30`

### 5.4 The failure mode must be "unknown", never "available"

```
expires_at = last_confirming_observation.captured_at + (2 × halflife)
```

On expiry the state becomes **`unknown`** — never `vacant`.

> **Hard rule: there is no code path anywhere in this system that lets silence produce
> "available".** Inaction produces doubt. This single rule is what the graveyard in the
> research report is missing.

---

## 6. The Derived State Table

```sql
-- =============================================================================
-- TABLE: vacancy_states
-- Purpose: Derived, cached, decaying public truth. ONE ROW PER SUBJECT.
--          Writable ONLY by recompute_vacancy_state(). No human writes here.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.vacancy_states (
  subject_id UUID PRIMARY KEY REFERENCES public.vacancy_subjects(id) ON DELETE CASCADE,

  published_status TEXT NOT NULL DEFAULT 'unknown' CHECK (published_status IN (
    'vacant','vacant_soon','taken','withdrawn','unknown','rejected'
  )),

  confidence_vacant NUMERIC(4,3) NOT NULL DEFAULT 0,
  confidence_taken  NUMERIC(4,3) NOT NULL DEFAULT 0,
  score_vacant      NUMERIC(6,4) NOT NULL DEFAULT 0,
  score_taken       NUMERIC(6,4) NOT NULL DEFAULT 0,

  -- Freshness, shown to tenants verbatim
  last_confirmed_at        TIMESTAMPTZ,
  last_confirmed_by_tier   SMALLINT,          -- tier only. NEVER the identity.
  last_observation_at      TIMESTAMPTZ,
  independent_voices       SMALLINT NOT NULL DEFAULT 0,
  expires_at               TIMESTAMPTZ,

  vacant_from_date DATE,

  -- Accuracy feedback (powers the north-star metric)
  arrivals_reported    INTEGER NOT NULL DEFAULT 0,
  arrivals_accurate    INTEGER NOT NULL DEFAULT 0,

  contested BOOLEAN NOT NULL DEFAULT false,   -- credible observers disagree right now
  recomputed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  observation_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_vacancy_states_published ON public.vacancy_states(published_status)
  WHERE published_status IN ('vacant','vacant_soon');
CREATE INDEX IF NOT EXISTS idx_vacancy_states_expiring  ON public.vacancy_states(expires_at)
  WHERE published_status IN ('vacant','vacant_soon');
CREATE INDEX IF NOT EXISTS idx_vacancy_states_contested ON public.vacancy_states(contested) WHERE contested;

COMMENT ON COLUMN public.vacancy_states.last_confirmed_by_tier IS
  'Tier only, never observer_id. Publishing who confirmed exposes caretakers to retaliation — see incentive doc risk 5.';
```

### Recompute triggers
1. **On insert** of any observation for that subject (trigger, synchronous)
2. **Lazy on read** if `recomputed_at` is older than 15 minutes
3. **Sweep job** every 10 minutes over `expires_at < now()` — this is what actually expires
   stale vacancies, and it must run or the whole design silently degrades into a normal
   rotting portal

---

## 7. Write Authority (RLS)

### 7.1 The landlord opt-in gate

From the incentive doc risk #1: a caretaker posting an unauthorised vacancy can be fired,
and publishing photos of someone's building without permission is a Data Protection Act
exposure.

```sql
CREATE TABLE IF NOT EXISTS public.building_participation (
  building_id UUID PRIMARY KEY REFERENCES public.buildings(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  participation TEXT NOT NULL DEFAULT 'none' CHECK (participation IN (
    'none',            -- not on the platform: observations allowed but NEVER published
    'observe_only',    -- we may track status internally, no public listing
    'listed',          -- vacancies may be published publicly
    'full'             -- listed + rent records + caretaker payouts
  )),

  caretaker_payouts_enabled BOOLEAN NOT NULL DEFAULT false,
  landlord_sees_observer_identity BOOLEAN NOT NULL DEFAULT false,  -- default FALSE, deliberately
  consented_at TIMESTAMPTZ,
  consent_evidence TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON COLUMN public.building_participation.landlord_sees_observer_identity IS
  'Defaults FALSE. If a caretaker takes viewing fees without the landlord knowing (survey E6), exposing who reported what can cost him his job.';
```

`participation = 'none'` still permits observations — we can learn the market — but
`vacancy_states` for those subjects are **never readable by the public role.** Data
collection and publication are separated deliberately.

### 7.2 Observer authorisation

```sql
CREATE TABLE IF NOT EXISTS public.building_observers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  observer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  role TEXT NOT NULL CHECK (role IN ('caretaker','scout','resident','agent','landlord')),
  tier SMALLINT NOT NULL CHECK (tier BETWEEN 0 AND 4),

  -- A caretaker claim is worthless until the landlord confirms it
  confirmed_by_landlord BOOLEAN NOT NULL DEFAULT false,
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES public.profiles(id),

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended','revoked')),
  suspended_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (building_id, observer_id, role)
);

CREATE INDEX IF NOT EXISTS idx_building_observers_observer ON public.building_observers(observer_id, status);
CREATE INDEX IF NOT EXISTS idx_building_observers_building ON public.building_observers(building_id, status);
```

### 7.3 RLS policy shape

```sql
ALTER TABLE public.unit_observations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacancy_states     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacancy_subjects   ENABLE ROW LEVEL SECURITY;

-- INSERT ONLY, as yourself, rate-limited. No update/delete policy exists at all.
CREATE POLICY "observers insert own observations" ON public.unit_observations
  FOR INSERT TO authenticated
  WITH CHECK (
    observer_id = auth.uid()
    AND public.observation_rate_ok(auth.uid(), subject_id)
  );

-- An observer sees only their own observations. Nobody browses the ledger.
CREATE POLICY "observers read own observations" ON public.unit_observations
  FOR SELECT TO authenticated
  USING (observer_id = auth.uid());

-- Public reads derived state only, and only for opted-in buildings
CREATE POLICY "public reads published states" ON public.vacancy_states
  FOR SELECT TO anon, authenticated
  USING (
    published_status IN ('vacant','vacant_soon','taken')
    AND EXISTS (
      SELECT 1 FROM public.vacancy_subjects s
      LEFT JOIN public.building_participation bp ON bp.building_id = s.building_id
      WHERE s.id = vacancy_states.subject_id
        AND s.merged_into_id IS NULL
        AND COALESCE(bp.participation, 'none') IN ('listed','full')
    )
  );

-- vacancy_states has NO insert/update policy for any human role.
-- recompute_vacancy_state() is SECURITY DEFINER and is the only writer.
```

**Rate limit** (`observation_rate_ok`): max 1 observation per observer per subject per
**30 minutes**, max 40 per observer per day, max 12 per observer per building per day.
Without this, the reward system is a faucet.

---

## 8. Closing the Loop — Outcomes and Accuracy

Observations are scored **retrospectively** against ground truth. This is what makes lying
expensive without any human policing it.

```sql
CREATE TABLE IF NOT EXISTS public.observation_outcomes (
  observation_id UUID PRIMARY KEY REFERENCES public.unit_observations(id) ON DELETE CASCADE,
  observer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  outcome TEXT NOT NULL CHECK (outcome IN (
    'corroborated',   -- independent observer agreed
    'contradicted',   -- ground truth disagreed
    'confirmed_true', -- ground truth agreed
    'unresolved',     -- aged out with no evidence either way
    'voided'          -- fraud / collusion
  )),
  resolved_by TEXT NOT NULL CHECK (resolved_by IN (
    'independent_observation','lease_created','tenant_move_in','viewing_report',
    'landlord_confirmation','admin_review','timeout'
  )),
  ground_truth_ref UUID,
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_outcomes_observer ON public.observation_outcomes(observer_id, resolved_at DESC);
```

### Ground truth, strongest first
1. A **lease row created** in the existing property-management tables → unit is taken
2. **Incoming tenant** confirms move-in (weight 0.95)
3. **Viewing report**: a tenant arrived and says what they found
4. **Landlord confirmation**
5. An **independent observation** at higher weight
6. **Timeout** → `unresolved` (does *not* count against the observer)

### Observer stats, recomputed from outcomes

```sql
CREATE TABLE IF NOT EXISTS public.observer_stats (
  observer_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  observations_total     INTEGER NOT NULL DEFAULT 0,
  observations_scored    INTEGER NOT NULL DEFAULT 0,
  observations_accurate  INTEGER NOT NULL DEFAULT 0,
  accuracy_wilson        NUMERIC(4,3) NOT NULL DEFAULT 0.500,
  taken_signals_given    INTEGER NOT NULL DEFAULT 0,   -- surfaced publicly: honesty is a badge
  median_hours_to_report NUMERIC(6,2),                 -- speed = freshness
  buildings_covered      INTEGER NOT NULL DEFAULT 0,
  flags_collusion        INTEGER NOT NULL DEFAULT 0,
  flags_fee_reports      INTEGER NOT NULL DEFAULT 0,   -- tenants reporting a viewing charge
  suspended BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

`accuracy_wilson` feeds the `track_record_weight` of the observer's **next** observation, and
gates their payout rate. **The loop is: lie → contradicted → Wilson drops → your weight
drops → your earnings drop.** No moderator required.

---

## 9. Viewing Outcomes — the north-star metric and the fee tripwire

```sql
CREATE TABLE IF NOT EXISTS public.viewing_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.vacancy_subjects(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Published state AT THE MOMENT the tenant decided to travel. Frozen.
  published_status_at_departure TEXT NOT NULL,
  state_confidence_at_departure NUMERIC(4,3),
  last_confirmed_at_departure   TIMESTAMPTZ,

  found TEXT NOT NULL CHECK (found IN (
    'vacant_as_described','taken','does_not_exist','different_price',
    'different_unit','could_not_access','nobody_came'
  )),

  -- The anti-fee tripwire (incentive doc §7)
  asked_for_money BOOLEAN,
  amount_asked DECIMAL(10,2),
  asked_by_role TEXT CHECK (asked_by_role IN ('caretaker','agent','landlord','stranger','unknown')),

  travel_cost DECIMAL(10,2),           -- what a wrong answer actually cost this person
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_viewing_outcomes_subject ON public.viewing_outcomes(subject_id);
CREATE INDEX IF NOT EXISTS idx_viewing_outcomes_fees    ON public.viewing_outcomes(asked_for_money)
  WHERE asked_for_money IS TRUE;
```

**The north-star metric, computable directly:**

```sql
CREATE OR REPLACE VIEW public.v_status_accuracy AS
SELECT
  date_trunc('week', reported_at) AS week,
  count(*) AS arrivals,
  count(*) FILTER (WHERE found = 'vacant_as_described') AS accurate,
  round(100.0 * count(*) FILTER (WHERE found = 'vacant_as_described') / NULLIF(count(*),0), 1)
    AS accuracy_pct
FROM public.viewing_outcomes
WHERE published_status_at_departure IN ('vacant','vacant_soon')
GROUP BY 1 ORDER BY 1 DESC;
```

> **Above ~90% → something that has never existed in Kenya. Below ~70% → we are another
> line in the research report's graveyard.**

`asked_for_money` is the single most important enforcement field in the system. One tap,
after every viewing. It is what makes the badge worth keeping.

---

## 10. Reward Escrow

```sql
CREATE TABLE IF NOT EXISTS public.observation_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id UUID NOT NULL REFERENCES public.unit_observations(id) ON DELETE CASCADE,
  observer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  reward_type TEXT NOT NULL CHECK (reward_type IN (
    'status_confirm','taken_confirm','vacancy_scoop','viewing_conducted',
    'retainer','let_bonus','move_in_confirm'
  )),
  points INTEGER NOT NULL DEFAULT 0,
  amount_kes DECIMAL(10,2) NOT NULL DEFAULT 0,

  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN (
    'pending',    -- awaiting corroboration or ground truth
    'confirmed',  -- payable
    'paid',
    'voided'      -- contradicted or fraudulent
  )),
  confirmed_at TIMESTAMPTZ,
  payout_batch_id UUID,
  void_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rewards_observer_state ON public.observation_rewards(observer_id, state);
CREATE INDEX IF NOT EXISTS idx_rewards_payable ON public.observation_rewards(state) WHERE state = 'confirmed';
```

**Escrow rule: nothing is payable on assertion.** A reward moves `pending → confirmed` only
when the observation is `corroborated` or `confirmed_true`. `contradicted` → `voided`.

Per the incentive doc: **pay more for `taken_confirm` than `status_confirm`** (KSh 100–150 vs
20–50), and release the `let_bonus` **only when the unit is marked taken.** The largest
payment in the system is collected by telling the truth.

Payouts batch weekly at a **KSh 500** threshold — micro-payments do not survive M-Pesa fees.

---

## 11. Collusion Detection

```sql
CREATE TABLE IF NOT EXISTS public.observer_pair_stats (
  observer_a UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  observer_b UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  corroborations INTEGER NOT NULL DEFAULT 0,
  mutual_only_rate NUMERIC(4,3),     -- share of each one's corroborations involving ONLY the other
  shared_devices INTEGER NOT NULL DEFAULT 0,
  flagged BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMPTZ,
  PRIMARY KEY (observer_a, observer_b),
  CONSTRAINT ordered_pair CHECK (observer_a < observer_b)
);
```

Flag when: `corroborations ≥ 8` **AND** `mutual_only_rate > 0.7` — two people who only ever
confirm each other are not two people. Also flag shared `device_fingerprint`, shared
M-Pesa payout identity, and geographically impossible sequences (two observations 20 km
apart within 10 minutes).

A flagged pair's observations collapse to **one** `independence_key`, which removes the
benefit of the scheme automatically — before any human reviews it.

---

## 12. What a Tenant Actually Sees

Never a boolean. Always state **plus freshness plus who class-of-person confirmed it**:

| State | Shown as |
|---|---|
| `vacant`, confirmed < 6h, tier 2+ | **"Free now — confirmed 3 hours ago by the caretaker"** |
| `vacant`, confirmed 1–3 days | "Free — last confirmed 2 days ago" |
| `vacant`, nearing expiry | "Last confirmed 6 days ago — may be gone. Ask us to check." |
| `vacant_soon` | **"Free from 1 December — the current tenant has given notice"** |
| `unknown` | "We are not sure this is still free. Tap to request a check." |
| `taken` | "Taken" — and still visible, because it shows the system tells the truth |
| `contested` | "Reports disagree — we are checking" |

Three deliberate choices here:

1. **Show the freshness always.** Nobody in Kenya does this. "Confirmed 3 hours ago" is the
   product.
2. **Keep showing `taken`.** Hiding it hides the honesty. A platform that visibly closes
   houses is a platform that can be believed about the open ones.
3. **Never name the confirmer.** Tier only. Naming a caretaker who reported a unit taken
   exposes him — see incentive doc risk #5.

---

## 13. What We Deliberately Do NOT Build

- **No tenant blacklist / defaulters register.** Defamation plus Data Protection Act
  exposure, and it is the feature landlords will ask for most. Build positive,
  tenant-held, tenant-shared history instead (research report §9.4).
- **No raw ledger browsing.** No role can read other people's observations. Prevents both
  scraping and retaliation.
- **No photos of occupied units or of people.** Observations of occupied units record the
  fact only, never media.
- **No single-writer public status.** There is no column anywhere that one human can set to
  make a house appear available.
- **No "assume available".** Already stated as a hard rule in §5.4, repeated because it is
  the one rule whose violation silently turns this into every dead portal.
- **Retention:** raw `latitude`/`longitude`, `device_fingerprint` and `ip_hash` purge after
  **90 days**, keeping derived weights and outcomes. Collect what we need, keep it as long
  as it is useful, no longer.

---

## 14. Build Order

| Step | What | Why first |
|---|---|---|
| 1 | `vacancy_subjects`, `unit_observations`, `vacancy_states` + recompute fn + sweep job | The spine. Nothing works without decay actually running. |
| 2 | `building_participation`, `building_observers` | The legal and employment gate. Must exist before any publishing. |
| 3 | `viewing_outcomes` + `v_status_accuracy` | **Instrument before scaling.** We need the north-star metric from day one, not retrofitted. |
| 4 | `observation_outcomes`, `observer_stats` | Closes the honesty loop |
| 5 | `observation_rewards` | Only after outcomes exist — paying before we can score is paying for noise |
| 6 | `observer_pair_stats`, rate limits | Before any public launch |

**Steps 1–3 are the pilot.** One ward, ~25 buildings, ~10 caretakers, 90 days, measuring
one number.

### Open items blocking implementation
1. **Caretaker survey results** — tier weights and reward amounts are hypotheses
   (`CARETAKER_FIELD_SURVEY.md` G2/G3/G9)
2. **USSD vs app** — survey F1 decides whether geotagged photo evidence is realistic
3. **Counsel** on the `let_bonus` flow against the Estate Agents Act (incentive doc risk #3)
4. **Enum style** — this design uses `TEXT ... CHECK` rather than Postgres enums for claim
   and state vocabularies, because these will grow and `ALTER TYPE` is painful in migrations.
   The repo uses both patterns; confirm before landing.
