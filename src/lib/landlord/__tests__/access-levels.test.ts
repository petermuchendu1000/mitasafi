/**
 * The access model's two couplings, and the rule that nothing is granted by
 * accident. These are warnings the landlord sees BEFORE they save, so they
 * have to be right — a wrong warning is worse than none.
 */

import {
  accessWarnings,
  choicesFor,
  describeLateFeeRule,
  ROLE_PRESETS,
  ACCESS_MODULES,
} from "../settings-schema";

const allNone = () => {
  const l: Record<string, string> = {};
  for (const m of ACCESS_MODULES) l[m.key] = "none";
  return l;
};

describe("warnings", () => {
  it("warns that tenant access cannot be limited to selected blocks", () => {
    const l = { ...allNone(), access_tenant: "view" };
    expect(accessWarnings(l, false).join(" ")).toMatch(/cannot be limited/i);
    // ...and stops warning once it is portfolio-wide.
    expect(accessWarnings(l, true).join(" ")).not.toMatch(/cannot be limited/i);
  });

  it("warns that invoices without leases show nothing", () => {
    const l = { ...allNone(), access_invoice: "all" };
    expect(accessWarnings(l, true).join(" ")).toMatch(
      /only through their lease/i,
    );
    const ok = { ...l, access_lease: "view" };
    expect(accessWarnings(ok, true).join(" ")).not.toMatch(
      /only through their lease/i,
    );
  });

  it("says plainly when a person has been granted nothing", () => {
    expect(accessWarnings(allNone(), false).join(" ")).toMatch(/see nothing/i);
  });

  it("does not warn about a module that is merely unenforced", () => {
    // Reports is recorded-only; granting it alone still means "sees nothing",
    // because nothing enforced was granted.
    const l = { ...allNone(), access_report: "all" };
    expect(accessWarnings(l, true).join(" ")).toMatch(/see nothing/i);
  });
});

describe("the presets", () => {
  it("gives Maintenance Staff maintenance and nothing else that bites", () => {
    // Innago's own matrix gives this role Settings: Limited, which is
    // recorded-only here. What matters is that no ENFORCED module beyond
    // maintenance is granted — that is the difference between a caretaker and
    // somebody with the run of the place.
    const p = ROLE_PRESETS.find((r) => r.value === "caretaker")!;
    const enforcedGrants = ACCESS_MODULES.filter(
      (m) => m.enforced && p.levels![m.key] && p.levels![m.key] !== "none",
    ).map((m) => m.key);
    expect(enforcedGrants).toEqual(["access_maintenance"]);
  });

  it("mirrors Innago's Settings column: All or Limited, never None", () => {
    const settings = ACCESS_MODULES.find((m) => m.key === "access_settings")!;
    expect(choicesFor(settings).map((c) => c.value)).toEqual([
      "all",
      "limited",
    ]);
  });

  it("offers All/View/None everywhere else", () => {
    for (const m of ACCESS_MODULES) {
      if (m.key === "access_settings") continue;
      expect(choicesFor(m).map((c) => c.value)).toEqual([
        "all",
        "view",
        "none",
      ]);
    }
  });

  it("never gives a non-owner role write access to money without leases", () => {
    for (const p of ROLE_PRESETS) {
      if (!p.levels) continue;
      if (p.levels.access_invoice !== "none") {
        expect(p.levels.access_lease).not.toBe("none");
      }
    }
  });

  it("marks every preset that grants tenants as portfolio-wide", () => {
    // Otherwise the preset would produce a configuration that shows nobody.
    for (const p of ROLE_PRESETS) {
      if (!p.levels) continue;
      if (p.levels.access_tenant !== "none") {
        expect(p.allProperties).toBe(true);
      }
    }
  });

  it("produces no warnings for any preset as shipped", () => {
    for (const p of ROLE_PRESETS) {
      if (!p.levels) continue;
      const w = accessWarnings(p.levels, p.allProperties ?? false);
      expect({ role: p.value, warnings: w }).toEqual({
        role: p.value,
        warnings: [],
      });
    }
  });

  it("offers Custom with no levels of its own", () => {
    expect(ROLE_PRESETS.find((r) => r.value === "custom")!.levels).toBeNull();
  });
});

describe("the late fee summary line", () => {
  it("describes a percentage rule the way Innago prints it", () => {
    expect(
      describeLateFeeRule({
        fee_type: "percentage",
        percentage: 10,
        amount: null,
        grace_period_days: 5,
      }),
    ).toBe("10% of the total amount with a grace period of 5 days.");
  });

  it("describes a fixed rule in shillings", () => {
    expect(
      describeLateFeeRule({
        fee_type: "fixed",
        percentage: null,
        amount: 1000,
        grace_period_days: 1,
      }),
    ).toBe("KES 1,000 with a grace period of 1 day.");
  });

  it("says 'no grace period' rather than '0 days'", () => {
    expect(
      describeLateFeeRule({
        fee_type: "daily",
        percentage: null,
        amount: 200,
        grace_period_days: 0,
      }),
    ).toBe("KES 200 per day late with no grace period.");
  });
});
