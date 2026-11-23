/**
 * Mapping the Add/Edit Unit form onto a `units` row.
 *
 * The group that matters most is "values the database would reject", because
 * this form shipped offering two of them. Its UNIT_TYPES list had
 * `single_room` and `shop`, neither in units_unit_type_check — had the form
 * ever submitted, those options would have failed with a 23514 for every
 * landlord who picked them.
 *
 * The second group is the column names. The form collected size_sqft,
 * rent_amount, floor and a `features` array; the columns are size_sqm,
 * monthly_rent, floor_level (TEXT) and five typed JSONB groups.
 */

import {
  buildUnitUpsert,
  unitRowToForm,
  UNIT_TYPE_VALUES,
  UNIT_STATUS_VALUES,
  BEDROOMS_FOR_TYPE,
  EMPTY_UNIT_FORM,
  type UnitFormValues,
} from "../unit-form";

const VALID: UnitFormValues = {
  ...EMPTY_UNIT_FORM,
  unit_number: "A101",
  unit_type: "2br",
  monthly_rent: "85000",
};

const build = (over: Partial<UnitFormValues> = {}) =>
  buildUnitUpsert({ ...VALID, ...over });

describe("the allowed sets match the CHECK constraints", () => {
  it("unit_type is exactly units_unit_type_check", () => {
    expect([...UNIT_TYPE_VALUES].sort()).toEqual(
      [
        "1br",
        "2br",
        "3br",
        "4br",
        "5br_plus",
        "bedsitter",
        "bungalow",
        "duplex",
        "house",
        "loft",
        "maisonette",
        "penthouse",
        "studio",
        "townhouse",
        "villa",
      ].sort(),
    );
  });

  it("status has all FOUR values, including reserved", () => {
    expect([...UNIT_STATUS_VALUES].sort()).toEqual(
      ["maintenance", "occupied", "reserved", "vacant"].sort(),
    );
  });

  it("rejects single_room, which the old form offered", () => {
    const r = build({ unit_type: "single_room" });
    expect(r.errors.unit_type).toBeTruthy();
    expect(r.values).toBeNull();
  });

  it("rejects shop, which the old form also offered", () => {
    expect(build({ unit_type: "shop" }).errors.unit_type).toBeTruthy();
  });

  it("accepts every type it offers", () => {
    for (const t of UNIT_TYPE_VALUES) {
      expect(build({ unit_type: t }).errors.unit_type).toBeUndefined();
    }
  });

  it("accepts a reserved unit, which the old status map would have crashed on", () => {
    expect(build({ status: "reserved" }).errors.status).toBeUndefined();
  });

  it("rejects a status outside the constraint", () => {
    expect(build({ status: "sold" }).errors.status).toBeTruthy();
  });
});

describe("a valid unit", () => {
  it("produces a row with no errors", () => {
    const r = build();
    expect(r.errors).toEqual({});
    expect(r.values!.unit_number).toBe("A101");
    expect(r.values!.unit_type).toBe("2br");
    expect(r.values!.monthly_rent).toBe(85000);
    expect(r.values!.status).toBe("vacant");
  });

  it("trims the unit number", () => {
    expect(build({ unit_number: "  A101 " }).values!.unit_number).toBe("A101");
  });

  it("never returns values alongside an error", () => {
    expect(build({ unit_number: "" }).values).toBeNull();
  });
});

describe("required fields", () => {
  it("rejects an empty unit number", () => {
    expect(build({ unit_number: "  " }).errors.unit_number).toBeTruthy();
  });

  it("rejects a missing unit type", () => {
    expect(build({ unit_type: "" }).errors.unit_type).toBeTruthy();
  });

  it("rejects missing rent", () => {
    expect(build({ monthly_rent: "" }).errors.monthly_rent).toBeTruthy();
  });

  it("rejects rent of zero, which the column would accept", () => {
    // valid_rent is CHECK (monthly_rent >= 0), so 0 stores fine. A unit at no
    // rent is almost always a half-filled form.
    expect(build({ monthly_rent: "0" }).errors.monthly_rent).toBeTruthy();
  });

  it("rejects negative rent", () => {
    expect(build({ monthly_rent: "-5000" }).errors.monthly_rent).toBeTruthy();
  });

  it("accepts rent typed with thousands separators", () => {
    expect(build({ monthly_rent: "85,000" }).values!.monthly_rent).toBe(85000);
  });
});

describe("bedrooms", () => {
  it("is taken from the type when left blank", () => {
    expect(build({ unit_type: "3br", bedrooms: "" }).values!.bedrooms).toBe(3);
    expect(
      build({ unit_type: "bedsitter", bedrooms: "" }).values!.bedrooms,
    ).toBe(0);
    expect(
      build({ unit_type: "5br_plus", bedrooms: "" }).values!.bedrooms,
    ).toBe(5);
  });

  it("is 0 for a type whose name does not settle it", () => {
    // A villa can be any size, so the map stays out of it.
    expect(BEDROOMS_FOR_TYPE.villa).toBeUndefined();
    expect(build({ unit_type: "villa", bedrooms: "" }).values!.bedrooms).toBe(
      0,
    );
  });

  it("is whatever was typed when it was typed", () => {
    expect(build({ unit_type: "2br", bedrooms: "3" }).values!.bedrooms).toBe(3);
  });

  it("accepts an explicit zero", () => {
    expect(build({ bedrooms: "0" }).values!.bedrooms).toBe(0);
  });

  it("rejects a fraction and text", () => {
    expect(build({ bedrooms: "2.5" }).errors.bedrooms).toBeTruthy();
    expect(build({ bedrooms: "two" }).errors.bedrooms).toBeTruthy();
  });
});

describe("bathrooms, which the column stores to one decimal", () => {
  it("accepts a half bathroom", () => {
    expect(build({ bathrooms: "1.5" }).values!.bathrooms).toBe(1.5);
  });

  it("rejects two decimal places the column would truncate", () => {
    // DECIMAL(3,1): 1.25 would silently become 1.2 or 1.3.
    expect(build({ bathrooms: "1.25" }).errors.bathrooms).toBeTruthy();
  });

  it("is null when left blank", () => {
    expect(build({ bathrooms: "" }).values!.bathrooms).toBeNull();
  });

  it("rejects a negative count", () => {
    expect(build({ bathrooms: "-1" }).errors.bathrooms).toBeTruthy();
  });
});

describe("optional fields become null, not zero or empty string", () => {
  it("floor, wing, size, deposit and service charge", () => {
    const v = build().values!;
    expect(v.floor_level).toBeNull();
    expect(v.wing_block).toBeNull();
    expect(v.size_sqm).toBeNull();
    expect(v.deposit_amount).toBeNull();
    expect(v.service_charge).toBeNull();
  });

  it("floor_level is TEXT, so 'G' is a floor", () => {
    // The old form typed this as a number; ground floors and mezzanines are
    // not numbers in Kenya.
    expect(build({ floor_level: "G" }).values!.floor_level).toBe("G");
  });

  it("rejects a size of zero", () => {
    expect(build({ size_sqm: "0" }).errors.size_sqm).toBeTruthy();
  });
});

describe("features map onto the JSONB groups, not a column that does not exist", () => {
  it("routes each ticked feature to its group", () => {
    const v = build({
      features: ["ensuite", "fitted_kitchen", "ac", "security_door"],
    }).values!;
    expect((v.bathroom_features as Record<string, boolean>).ensuite).toBe(true);
    expect((v.kitchen_features as Record<string, boolean>).fitted_kitchen).toBe(
      true,
    );
    expect((v.climate_control as Record<string, boolean>).ac).toBe(true);
    expect((v.security_features as Record<string, boolean>).security_door).toBe(
      true,
    );
  });

  it("records the ones NOT ticked as false rather than leaving them out", () => {
    // "we asked and they said no" is different from "we never asked".
    const v = build({ features: ["ensuite"] }).values!;
    expect((v.bathroom_features as Record<string, boolean>).water_heater).toBe(
      false,
    );
  });

  it("counts a balcony in the balconies column, not an amenity group", () => {
    expect(build({ features: ["balcony"] }).values!.balconies).toBe(1);
    expect(build({ features: [] }).values!.balconies).toBe(0);
  });

  it("puts the description in metadata, since there is no description column", () => {
    const v = build({ description: "Corner unit, good light." }).values!;
    expect((v.metadata as Record<string, string>).description).toBe(
      "Corner unit, good light.",
    );
  });

  it("leaves metadata empty when there is no description", () => {
    expect(build({ description: "  " }).values!.metadata).toEqual({});
  });
});

describe("unitRowToForm", () => {
  const row = {
    unit_number: "A101",
    unit_type: "2br",
    floor_level: "1",
    wing_block: null,
    bedrooms: 2,
    bathrooms: "1.5",
    size_sqm: "60.00",
    monthly_rent: "85000.00",
    deposit_amount: null,
    service_charge: null,
    status: "occupied",
    furnishing: "partial",
    balconies: 1,
    kitchen_features: { fitted_kitchen: true },
    bathroom_features: { ensuite: true, water_heater: false },
    climate_control: {},
    storage_features: {},
    security_features: { security_door: true },
    metadata: { description: "Corner unit" },
  };

  it("fills the form from a stored row", () => {
    const f = unitRowToForm(row);
    expect(f.unit_number).toBe("A101");
    expect(f.bathrooms).toBe("1.5");
    expect(f.monthly_rent).toBe("85000.00");
    expect(f.status).toBe("occupied");
    expect(f.description).toBe("Corner unit");
  });

  it("recovers the ticked features, and only those", () => {
    expect(unitRowToForm(row).features.sort()).toEqual(
      ["balcony", "ensuite", "fitted_kitchen", "security_door"].sort(),
    );
  });

  it("round-trips: form -> row -> form keeps the features", () => {
    const first = build({
      features: ["balcony", "ac", "wardrobes"],
      unit_type: "3br",
    }).values!;
    const back = unitRowToForm({ ...row, ...first, metadata: first.metadata });
    expect(back.features.sort()).toEqual(["ac", "balcony", "wardrobes"].sort());
  });

  it("copes with nulls everywhere", () => {
    const f = unitRowToForm({
      ...row,
      floor_level: null,
      bedrooms: null,
      bathrooms: null,
      size_sqm: null,
      monthly_rent: null,
      status: null,
      furnishing: null,
      balconies: null,
      kitchen_features: null,
      bathroom_features: null,
      climate_control: null,
      storage_features: null,
      security_features: null,
      metadata: null,
    });
    expect(f.bedrooms).toBe("");
    expect(f.status).toBe("vacant");
    expect(f.furnishing).toBe("unfurnished");
    expect(f.features).toEqual([]);
    expect(f.description).toBe("");
  });
});
