/**
 * The access model's two couplings, and the rule that nothing is granted by
 * accident. These are warnings the landlord sees BEFORE they save, so they
 * have to be right — a wrong warning is worse than none.
 */

import {
  accessWarnings,
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
  it("gives Maintenance Staff maintenance and nothing else", () => {
    const p = ROLE_PRESETS.find((r) => r.value === "caretaker")!;
    const granted = Object.entries(p.levels!)
      .filter(([, v]) => v !== "none")
      .map(([k]) => k);
    expect(granted).toEqual(["access_maintenance"]);
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
