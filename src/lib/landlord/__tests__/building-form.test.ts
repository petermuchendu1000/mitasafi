/**
 * Building edit form validation.
 *
 * The group that matters most is "values the database would reject": the form
 * offers a fixed set of building types, statuses and management types, and all
 * three columns are CHECK-constrained. Anything that gets past this function and
 * violates a constraint comes back as a 23514 the user cannot act on, so these
 * tests assert the allowed sets ARE the constraint's values, spelled out
 * literally here rather than derived — deriving them from the same map the code
 * uses would make the assertion vacuous.
 */

import {
  validateBuildingForm,
  BUILDING_TYPES,
  BUILDING_STATUSES,
  MANAGEMENT_TYPES,
  type BuildingFormValues,
} from "../building-form";

const VALID: BuildingFormValues = {
  name: "Riverside Court",
  building_type: "apartment",
  address: "Riverside Drive",
  area: "Kilimani",
  city: "Nairobi",
  total_floors: "5",
  year_built: "2018",
  plot_number: "LR 209/114",
  management_type: "self",
  service_charge: "5000",
  status: "active",
};

function check(overrides: Partial<BuildingFormValues> = {}, year = 2026) {
  return validateBuildingForm({ ...VALID, ...overrides }, year);
}

describe("the allowed sets match the CHECK constraints", () => {
  it("building_type", () => {
    expect([...BUILDING_TYPES].sort()).toEqual(
      [
        "apartment",
        "flat_block",
        "gated_community",
        "mixed_use",
        "other",
        "student_hostel",
        "townhouse_complex",
      ].sort(),
    );
  });

  it("status", () => {
    expect([...BUILDING_STATUSES].sort()).toEqual(
      ["active", "archived", "inactive"].sort(),
    );
  });

  it("management_type", () => {
    expect([...MANAGEMENT_TYPES].sort()).toEqual(
      ["caretaker", "property_manager", "self"].sort(),
    );
  });

  it("rejects a type the constraint does not permit", () => {
    // "apartment_block" is the value the old pages used everywhere. Postgres
    // would refuse it; this refuses it where the user can see which field.
    const r = check({ building_type: "apartment_block" });
    expect(r.errors.building_type).toBeTruthy();
    expect(r.update).toBeNull();
  });

  it("rejects the 'draft' status the old filter offered", () => {
    expect(check({ status: "draft" }).errors.status).toBeTruthy();
  });

  it("rejects an unknown management type", () => {
    expect(
      check({ management_type: "agency" }).errors.management_type,
    ).toBeTruthy();
  });
});

describe("a complete, valid form", () => {
  it("produces an update and no errors", () => {
    const r = check();
    expect(r.errors).toEqual({});
    expect(r.update).toEqual({
      name: "Riverside Court",
      building_type: "apartment",
      address: "Riverside Drive",
      area: "Kilimani",
      city: "Nairobi",
      total_floors: 5,
      year_built: 2018,
      plot_number: "LR 209/114",
      management_type: "self",
      service_charge: 5000,
      status: "active",
    });
  });

  it("trims whitespace rather than storing it", () => {
    const r = check({ name: "  Riverside Court  ", area: " Kilimani " });
    expect(r.update?.name).toBe("Riverside Court");
    expect(r.update?.area).toBe("Kilimani");
  });

  it("never returns an update alongside an error", () => {
    const r = check({ name: "" });
    expect(r.update).toBeNull();
  });
});

describe("required fields", () => {
  it("rejects an empty name", () => {
    expect(check({ name: "" }).errors.name).toBeTruthy();
  });

  it("rejects a name that is only whitespace", () => {
    expect(check({ name: "   " }).errors.name).toBeTruthy();
  });

  it("rejects a one-character name", () => {
    expect(check({ name: "A" }).errors.name).toBeTruthy();
  });

  it("accepts a two-character name", () => {
    expect(check({ name: "A1" }).errors.name).toBeUndefined();
  });

  it("rejects a name over 120 characters", () => {
    expect(check({ name: "x".repeat(121) }).errors.name).toBeTruthy();
    expect(check({ name: "x".repeat(120) }).errors.name).toBeUndefined();
  });

  it("rejects an empty address", () => {
    expect(check({ address: "  " }).errors.address).toBeTruthy();
  });

  it("rejects an empty area", () => {
    // area is NOT NULL and is what tenants search by, so a blank one is not a
    // cosmetic omission.
    expect(check({ area: "" }).errors.area).toBeTruthy();
  });
});

describe("optional fields become null, not zero or empty string", () => {
  it("an empty city", () => {
    const r = check({ city: "" });
    expect(r.errors).toEqual({});
    expect(r.update?.city).toBeNull();
  });

  it("an empty floor count", () => {
    expect(check({ total_floors: "" }).update?.total_floors).toBeNull();
  });

  it("an empty year built", () => {
    expect(check({ year_built: "  " }).update?.year_built).toBeNull();
  });

  it("an empty plot number", () => {
    expect(check({ plot_number: "" }).update?.plot_number).toBeNull();
  });

  it("an empty service charge", () => {
    // Not 0: "no service charge recorded" and "the service charge is zero" are
    // different claims, and the column is nullable so it can say so.
    expect(check({ service_charge: "" }).update?.service_charge).toBeNull();
  });
});

describe("numbers", () => {
  it("rejects a fractional floor count", () => {
    expect(check({ total_floors: "2.5" }).errors.total_floors).toBeTruthy();
  });

  it("rejects zero floors and accepts one", () => {
    expect(check({ total_floors: "0" }).errors.total_floors).toBeTruthy();
    expect(check({ total_floors: "1" }).errors.total_floors).toBeUndefined();
  });

  it("rejects a negative floor count", () => {
    expect(check({ total_floors: "-3" }).errors.total_floors).toBeTruthy();
  });

  it("rejects 201 floors and accepts 200", () => {
    expect(check({ total_floors: "201" }).errors.total_floors).toBeTruthy();
    expect(check({ total_floors: "200" }).errors.total_floors).toBeUndefined();
  });

  it("rejects text in a number field", () => {
    expect(check({ total_floors: "five" }).errors.total_floors).toBeTruthy();
  });

  it("allows a year up to five years ahead, for a building under construction", () => {
    expect(
      check({ year_built: "2031" }, 2026).errors.year_built,
    ).toBeUndefined();
    expect(check({ year_built: "2032" }, 2026).errors.year_built).toBeTruthy();
  });

  it("rejects a year before 1800", () => {
    expect(check({ year_built: "1799" }).errors.year_built).toBeTruthy();
    expect(check({ year_built: "1800" }).errors.year_built).toBeUndefined();
  });

  it("accepts a service charge of exactly zero", () => {
    const r = check({ service_charge: "0" });
    expect(r.errors).toEqual({});
    expect(r.update?.service_charge).toBe(0);
  });

  it("rejects a negative service charge", () => {
    expect(check({ service_charge: "-1" }).errors.service_charge).toBeTruthy();
  });

  it("accepts a service charge typed with thousands separators", () => {
    expect(check({ service_charge: "12,500" }).update?.service_charge).toBe(
      12500,
    );
  });

  it("rounds to the two decimals the column stores", () => {
    // DECIMAL(10,2) truncates silently; rounding here means what is saved is what
    // the form said it would save.
    expect(check({ service_charge: "5000.456" }).update?.service_charge).toBe(
      5000.46,
    );
  });

  it("rejects a service charge that is not a number", () => {
    expect(
      check({ service_charge: "lots" }).errors.service_charge,
    ).toBeTruthy();
  });

  it("rejects an absurd service charge", () => {
    expect(
      check({ service_charge: "10000001" }).errors.service_charge,
    ).toBeTruthy();
  });
});

describe("several problems at once", () => {
  it("reports every bad field, not just the first", () => {
    const r = check({
      name: "",
      area: "",
      total_floors: "nope",
      status: "draft",
    });
    expect(Object.keys(r.errors).sort()).toEqual([
      "area",
      "name",
      "status",
      "total_floors",
    ]);
  });
});
