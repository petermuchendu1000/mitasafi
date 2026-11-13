/**
 * Provider-profile creation: the payload defects, and the properties that keep
 * them fixed.
 *
 * Two kinds of assertion live here.
 *
 * UNIT tests of buildProviderProfile are ordinary: it is a pure function, and
 * every defect it exists to prevent was a payload defect, so none of them
 * needed a live Postgres to catch. That is the finding, really -- three
 * guaranteed-failing writes and four fabricated phone numbers shipped because
 * nothing asserted on the payload.
 *
 * SOURCE assertions are textual, the same approach as
 * provider-activation-privilege.test.ts and server-action-boundary.test.ts.
 * They are properties of the FILES: which payload a call site sends, and
 * whether it checks the result. Neither can be observed by calling the
 * functions without a live Postgres carrying the real column grants.
 *
 * THE DEFECTS, as measured on the live schema:
 *
 * F-1/F-2  service_providers.phone is NOT NULL with no default and no BEFORE
 *          INSERT trigger, and `status` is not a column of the table at all
 *          (it is `account_status`). Two call sites sent
 *          {user_id, business_name, status:'pending'}, which could never
 *          succeed, for those two independent reasons. Both logged the error
 *          and continued, so the "add the provider role" path silently never
 *          created a provider profile.
 *
 * F-3      +254700000000 was substituted whenever no phone was available. It is
 *          the company's own published support number (src/app/contact/page.tsx
 *          renders tel:+254700000000), so those providers were published with
 *          Mitasafi's support line as their contact. At two of the four sites
 *          the real OTP-verified phone was already in scope as `fullPhone`.
 *
 * E-2/E-4  Two writes discarded their result entirely -- no destructure, no
 *          error check -- so a failed profile insert and a failed primary_role
 *          update both passed silently and the flow continued to redirect.
 */

import fs from "fs";
import path from "path";
import {
  buildProviderProfile,
  assertProviderPayloadSafe,
  PROVIDER_CLIENT_WRITABLE_COLUMNS,
  PROVIDER_TRUST_COLUMNS,
  PROVIDER_PHONE_FORMAT,
} from "@/lib/identity/provider-profile";

const read = (p: string) =>
  fs.readFileSync(path.join(process.cwd(), p), "utf8");

/** Collapse fluent chains onto one line so they can be matched whole. */
const flatten = (source: string) => source.replace(/\s+/g, " ");

const CALLBACK = "src/app/auth/callback/route.ts";
const SIGNUP = "src/app/(auth)/signup/page.tsx";
const ONBOARDING = "src/app/(auth)/onboarding/provider-type/actions.ts";
const BUILDER = "src/lib/identity/provider-profile.ts";

/** Every file that creates a service_providers row. */
const PROVIDER_CREATION_FILES = [CALLBACK, SIGNUP, ONBOARDING];

/**
 * The fabricated phone number. It is the company's real support line, so it is
 * legitimate in exactly one place -- the contact page's tel: link -- and
 * nowhere else in application code.
 */
const FABRICATED_PHONE = "254700000000";
const FABRICATED_PHONE_ALLOWED_IN = ["src/app/contact/page.tsx"];

interface WriteSite {
  /** The line that opens the statement, e.g. `const { error } = await supabase`. */
  head: string;
  /** The fluent chain itself, e.g. `.from('profiles') .insert(x as never)`. */
  chain: string;
  /** 1-indexed line of the `.from(...)` call, for failure messages. */
  line: number;
}

/**
 * Every `.insert(` / `.update(` write to `table` in `source`.
 *
 * DO NOT split on ';' to find statements here. src/app/auth/callback/route.ts
 * carries 2 semicolons across 281 lines -- it relies on ASI -- so a
 * semicolon-split returns the whole file as a single statement, and every
 * assertion over it then passes or fails for the wrong reason. The first
 * version of this helper did exactly that and was red by accident.
 *
 * Instead: a fluent chain is the `.from(...)` line plus the contiguous
 * following lines whose trimmed text begins with '.', and the statement head is
 * the nearest preceding line beginning with const/let/var/await/return. That
 * holds under both semicolon styles.
 */
function writeSites(source: string, table: string): WriteSite[] {
  const lines = source.split("\n");
  const needles = [`.from("${table}")`, `.from('${table}')`];
  const sites: WriteSite[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (!needles.some((n) => lines[i].includes(n))) continue;

    let chain = lines[i].trim();
    let k = i + 1;
    while (k < lines.length && lines[k].trim().startsWith(".")) {
      chain += " " + lines[k].trim();
      k++;
    }
    if (!/\.(insert|update|upsert)\(/.test(chain)) continue;

    let j = i;
    while (j > 0 && !/^(const|let|var|await|return)\b/.test(lines[j].trim()))
      j--;

    sites.push({ head: lines[j].trim(), chain, line: i + 1 });
  }
  return sites;
}

/** Does this statement capture what the write returned? */
function capturesResult(head: string): boolean {
  // `const { error } = await ...` captures; a bare `await supabase...` does not.
  return /^(?:const|let|var)\s*\{/.test(head) || /\}\s*=\s*await/.test(head);
}

// ===========================================================================
// UNIT: buildProviderProfile
// ===========================================================================

describe("buildProviderProfile", () => {
  const VALID = {
    userId: "11111111-1111-1111-1111-111111111111",
    businessName: "Acme Plumbing",
    phoneCandidates: ["+254712345678"],
  };

  it("builds the three NOT NULL columns from valid input", () => {
    const result = buildProviderProfile(VALID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.record).toEqual({
      user_id: VALID.userId,
      business_name: "Acme Plumbing",
      phone: "+254712345678",
    });
  });

  it("includes business_type only when given", () => {
    const without = buildProviderProfile(VALID);
    expect(without.ok && "business_type" in without.record).toBe(false);

    const with_ = buildProviderProfile({ ...VALID, businessType: "company" });
    expect(with_.ok && with_.record.business_type).toBe("company");
  });

  it("NEVER emits a status column — service_providers has none", () => {
    const result = buildProviderProfile(VALID);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.record)).not.toContain("status");
    expect(Object.keys(result.record)).not.toContain("account_status");
  });

  it("NEVER emits a trust or money column", () => {
    const result = buildProviderProfile({ ...VALID, businessType: "company" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const col of PROVIDER_TRUST_COLUMNS) {
      expect(Object.keys(result.record)).not.toContain(col);
    }
  });

  it("emits only client-writable columns", () => {
    const result = buildProviderProfile({
      ...VALID,
      businessType: "individual",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const writable = new Set<string>(PROVIDER_CLIENT_WRITABLE_COLUMNS);
    for (const key of Object.keys(result.record)) {
      expect(writable.has(key)).toBe(true);
    }
  });

  // ---- the refusals: this is what replaces the fabricated number ----------

  it("FAILS rather than inventing a phone when none is available", () => {
    const result = buildProviderProfile({ ...VALID, phoneCandidates: [] });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("missing-phone");
    expect(result.message).toMatch(/phone number is required/i);
  });

  it("treats null, undefined and empty candidates as absent", () => {
    for (const candidates of [
      [null],
      [undefined],
      [""],
      ["   "],
      [null, undefined, ""],
    ]) {
      const result = buildProviderProfile({
        ...VALID,
        phoneCandidates: candidates,
      });
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.reason).toBe("missing-phone");
    }
  });

  it("never returns the fabricated number for any input", () => {
    const inputs = [
      { ...VALID, phoneCandidates: [] },
      { ...VALID, phoneCandidates: [null, undefined] },
      { ...VALID, phoneCandidates: ["not-a-phone"] },
      { ...VALID, phoneCandidates: ["+254712345678"] },
    ];
    for (const input of inputs) {
      const result = buildProviderProfile(input);
      const serialised = JSON.stringify(result);
      expect(serialised).not.toContain(FABRICATED_PHONE);
    }
  });

  it("takes the first VALID candidate, not merely the first present one", () => {
    const result = buildProviderProfile({
      ...VALID,
      phoneCandidates: ["junk", "+254712345678"],
    });
    expect(result.ok && result.record.phone).toBe("+254712345678");
  });

  it("strips display whitespace before validating", () => {
    const result = buildProviderProfile({
      ...VALID,
      phoneCandidates: ["+254 712 345 678"],
    });
    expect(result.ok && result.record.phone).toBe("+254712345678");
  });

  it("rejects phones the table's own CHECK would reject", () => {
    // phone_format: CHECK ((phone ~ '^\+?[0-9]{10,15}$'))
    for (const bad of [
      "0712345678x",
      "+254-712-345-678",
      "123456789", // 9 digits, below the minimum of 10
      "+2547123456789012", // 16 digits, above the maximum of 15
      "abcdefghijk",
    ]) {
      const result = buildProviderProfile({ ...VALID, phoneCandidates: [bad] });
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.reason).toBe("invalid-phone");
    }
  });

  it("accepts the boundary lengths the CHECK allows", () => {
    expect(PROVIDER_PHONE_FORMAT.test("0123456789")).toBe(true); // 10
    expect(PROVIDER_PHONE_FORMAT.test("012345678901234")).toBe(true); // 15
    expect(PROVIDER_PHONE_FORMAT.test("012345678")).toBe(false); // 9
    expect(PROVIDER_PHONE_FORMAT.test("0123456789012345")).toBe(false); // 16
  });

  it("rejects a missing business name or user id", () => {
    expect(buildProviderProfile({ ...VALID, businessName: "" }).ok).toBe(false);
    expect(buildProviderProfile({ ...VALID, businessName: "  " }).ok).toBe(
      false,
    );
    expect(buildProviderProfile({ ...VALID, userId: null }).ok).toBe(false);
  });
});

// ===========================================================================
// UNIT: assertProviderPayloadSafe
// ===========================================================================

describe("assertProviderPayloadSafe", () => {
  it("rejects the money column that made self-credit possible", () => {
    expect(() =>
      assertProviderPayloadSafe({ user_id: "u", wallet_balance: 150000 }),
    ).toThrow(/wallet_balance may never be written by a client/);
  });

  it("rejects every trust column", () => {
    for (const col of PROVIDER_TRUST_COLUMNS) {
      expect(() => assertProviderPayloadSafe({ [col]: 1 })).toThrow(
        /may never be written by a client/,
      );
    }
  });

  it("rejects the column name that never existed", () => {
    expect(() => assertProviderPayloadSafe({ status: "pending" })).toThrow(
      /no client-writable column "status"/,
    );
  });

  it("accepts a payload the builder produced", () => {
    const result = buildProviderProfile({
      userId: "u",
      businessName: "Acme",
      phoneCandidates: ["+254712345678"],
      businessType: "individual",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(() =>
      assertProviderPayloadSafe(
        result.record as unknown as Record<string, unknown>,
      ),
    ).not.toThrow();
  });

  it("knows 42 writable and 8 forbidden columns, matching the live grant", () => {
    expect(PROVIDER_CLIENT_WRITABLE_COLUMNS).toHaveLength(42);
    expect(PROVIDER_TRUST_COLUMNS).toHaveLength(8);
    // The two sets must not overlap, or the allowlist would re-admit a
    // column the trust list forbids.
    const writable = new Set<string>(PROVIDER_CLIENT_WRITABLE_COLUMNS);
    for (const col of PROVIDER_TRUST_COLUMNS) {
      expect(writable.has(col)).toBe(false);
    }
  });
});

// ===========================================================================
// SOURCE: F-3 — the fabricated phone number is gone
// ===========================================================================

describe("F-3: no fabricated phone number in application code", () => {
  it.each(PROVIDER_CREATION_FILES)(
    "%s does not contain the company support number",
    (file) => {
      expect(read(file)).not.toContain(FABRICATED_PHONE);
    },
  );

  it("appears nowhere under src/ except the contact page's tel: link", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(path.join(process.cwd(), dir), {
        withFileTypes: true,
      })) {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) {
          if (entry.name === "__tests__") continue;
          walk(rel);
        } else if (/\.(ts|tsx)$/.test(entry.name)) {
          if (FABRICATED_PHONE_ALLOWED_IN.includes(rel)) continue;
          if (read(rel).includes(FABRICATED_PHONE)) offenders.push(rel);
        }
      }
    };
    walk("src");
    expect(offenders).toEqual([]);
  });
});

// ===========================================================================
// SOURCE: F-1/F-2 — the two payloads that could never succeed
// ===========================================================================

describe("F-1/F-2: no service_providers payload can fail by construction", () => {
  // Asserted at FILE level, not on the chain: `status: 'pending'` sits in a
  // separate `const providerProfile = {...}` object literal, not in the fluent
  // chain, so a chain-scoped matcher could never see it. `status:` occurs
  // exactly twice across these three files and both are this defect, so the
  // file-level assertion is precise rather than merely broad.
  it.each(PROVIDER_CREATION_FILES)(
    "%s contains no status: key — service_providers has no status column",
    (file) => {
      expect(read(file)).not.toMatch(/\bstatus:\s*["']/);
    },
  );

  it.each(PROVIDER_CREATION_FILES)(
    "%s builds every service_providers payload through buildProviderProfile",
    (file) => {
      const source = read(file);
      // A file that no longer creates a provider row needs no import.
      const createsProvider = writeSites(source, "service_providers").some(
        (s) => s.chain.includes(".insert("),
      );
      if (!createsProvider) return;
      expect(source).toContain("buildProviderProfile");
    },
  );

  it("the callback no longer creates a provider row at all", () => {
    // Both of its attempts were premature: callback line 35 redirects every new
    // provider to /onboarding/provider-type, which creates the row properly
    // with the service-role client and 23505 race handling. One of the two
    // could never have succeeded anyway.
    const inserts = writeSites(read(CALLBACK), "service_providers")
      .filter((s) => s.chain.includes(".insert("))
      .map((s) => `${CALLBACK}:${s.line}`);
    expect(inserts).toEqual([]);
  });
});

// ===========================================================================
// SOURCE: E-2/E-4 — no write discards its result
// ===========================================================================

describe("E-2/E-4: identity writes check their result", () => {
  it.each([
    [SIGNUP, "profiles"],
    [SIGNUP, "user_roles"],
    [SIGNUP, "service_providers"],
    [CALLBACK, "profiles"],
    [CALLBACK, "user_roles"],
    [ONBOARDING, "service_providers"],
    [ONBOARDING, "user_roles"],
  ])("%s captures the result of every write to %s", (file, table) => {
    const discarded = writeSites(read(file), table)
      .filter((s) => !capturesResult(s.head))
      .map((s) => `${file}:${s.line} — ${s.head}`);
    expect(discarded).toEqual([]);
  });
});

// ===========================================================================
// The guard on the guard
// ===========================================================================

describe("this suite can fail", () => {
  it("detects a fabricated phone in a payload", () => {
    // Proves the F-3 matcher is not vacuous: the same assertion against text
    // that DOES contain the number must fail.
    const poisoned = `phone: "+${FABRICATED_PHONE}",`;
    expect(poisoned).toContain(FABRICATED_PHONE);
  });

  it("detects a discarded write", () => {
    const discarded =
      'await supabase.from("profiles").insert(profileData as never)';
    expect(capturesResult(discarded)).toBe(false);
    const checked =
      'const { error } = await supabase.from("profiles").insert(profileData as never)';
    expect(capturesResult(checked)).toBe(true);
  });

  it("detects a status column in a payload", () => {
    const poisoned = '.from("service_providers").insert({ status: "pending" })';
    expect(poisoned).toMatch(/\bstatus:\s*["']/);
  });

  it("reads real files", () => {
    expect(read(BUILDER)).toContain("buildProviderProfile");
    expect(() => read("src/does-not-exist.ts")).toThrow();
  });
});
