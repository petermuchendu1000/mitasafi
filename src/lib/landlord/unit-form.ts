/**
 * Validation and mapping for the Add/Edit Unit form.
 *
 * WHAT THIS REPLACES
 *   units/new/page.tsx collected a unit and then did:
 *     await new Promise((resolve) => setTimeout(resolve, 1000));
 *     console.log("Saving unit:", formData);
 *     router.push(`/dashboard/landlord/buildings/${buildingId}`);
 *   Nothing written, and the landlord sent back to a building that had not
 *   gained a unit.
 *
 * THE ENUM WAS GENUINELY WRONG HERE
 *   Its UNIT_TYPES list offered `single_room` and `shop`, neither of which
 *   units_unit_type_check permits. Had the form ever submitted, those two
 *   options would have failed with a 23514 for every landlord who picked them.
 *   (I previously suspected this of the BUILDING wizard and was wrong about
 *   that one — its seven values are exactly the constraint's. This is the form
 *   the problem was actually on.)
 *
 * COLUMN NAMES THE FORM HAD WRONG
 *   size_sqft -> size_sqm, rent_amount -> monthly_rent, floor -> floor_level
 *   (TEXT, not a number), and `features` is not a column at all — the unit
 *   amenities live in typed JSONB groups. The checkbox list is mapped onto
 *   those groups rather than invented as a new column.
 */

import type { Json } from "@/types/database";

/** units_unit_type_check, in the order a landlord thinks about them. */
export const UNIT_TYPE_VALUES = [
  "bedsitter",
  "studio",
  "1br",
  "2br",
  "3br",
  "4br",
  "5br_plus",
  "penthouse",
  "duplex",
  "loft",
  "maisonette",
  "bungalow",
  "townhouse",
  "villa",
  "house",
] as const;

/** units_status_check — all four. */
export const UNIT_STATUS_VALUES = [
  "vacant",
  "occupied",
  "maintenance",
  "reserved",
] as const;

/** units_furnishing_check */
export const FURNISHING_VALUES = [
  "unfurnished",
  "partial",
  "fully_furnished",
] as const;

/**
 * Bedrooms implied by the unit type, where the type settles it.
 *
 * Only the types whose names state a bedroom count appear here; a villa or a
 * maisonette can be any size, so those are left for the landlord to say.
 */
export const BEDROOMS_FOR_TYPE: Record<string, number> = {
  bedsitter: 0,
  studio: 0,
  "1br": 1,
  "2br": 2,
  "3br": 3,
  "4br": 4,
  "5br_plus": 5,
};

/**
 * The feature checkboxes, and which JSONB group each one belongs to.
 *
 * `features: string[]` was going to be written to a column that does not
 * exist. The units table has kitchen_features, bathroom_features,
 * climate_control, storage_features and security_features, all JSONB, so each
 * checkbox is routed to the group it describes.
 */
export const UNIT_FEATURES = [
  { id: "balcony", label: "Balcony", group: "layout" },
  { id: "ensuite", label: "En-suite bathroom", group: "bathroom_features" },
  { id: "water_heater", label: "Water heater", group: "bathroom_features" },
  { id: "fitted_kitchen", label: "Fitted kitchen", group: "kitchen_features" },
  { id: "ac", label: "Air conditioning", group: "climate_control" },
  { id: "storage", label: "Storage room", group: "storage_features" },
  { id: "wardrobes", label: "Built-in wardrobes", group: "storage_features" },
  { id: "security_door", label: "Security door", group: "security_features" },
  { id: "window_grills", label: "Window grills", group: "security_features" },
] as const;

export type UnitFeatureId = (typeof UNIT_FEATURES)[number]["id"];

/** Everything the form collects, as strings, because inputs produce strings. */
export interface UnitFormValues {
  unit_number: string;
  unit_type: string;
  floor_level: string;
  wing_block: string;
  bedrooms: string;
  bathrooms: string;
  size_sqm: string;
  monthly_rent: string;
  deposit_amount: string;
  service_charge: string;
  status: string;
  furnishing: string;
  features: string[];
  description: string;
}

export const EMPTY_UNIT_FORM: UnitFormValues = {
  unit_number: "",
  unit_type: "",
  floor_level: "",
  wing_block: "",
  bedrooms: "",
  bathrooms: "1",
  size_sqm: "",
  monthly_rent: "",
  deposit_amount: "",
  service_charge: "",
  status: "vacant",
  furnishing: "unfurnished",
  features: [],
  description: "",
};

/** The row handed to supabase.from("units"). */
export interface UnitUpsert {
  unit_number: string;
  unit_type: string;
  floor_level: string | null;
  wing_block: string | null;
  bedrooms: number;
  bathrooms: number | null;
  size_sqm: number | null;
  monthly_rent: number;
  deposit_amount: number | null;
  service_charge: number | null;
  status: string;
  furnishing: string;
  balconies: number;
  kitchen_features: Json;
  bathroom_features: Json;
  climate_control: Json;
  storage_features: Json;
  security_features: Json;
  metadata: Json;
}

export type UnitFormErrors = Partial<Record<keyof UnitFormValues, string>>;

export interface UnitFormResult {
  errors: UnitFormErrors;
  /** Present only when errors is empty. */
  values: UnitUpsert | null;
}

function text(v: string | undefined | null): string {
  return (v ?? "").trim();
}

function optionalText(v: string | undefined | null): string | null {
  const t = text(v);
  return t === "" ? null : t;
}

/** A required money amount. Thousands separators are accepted and stripped. */
function money(
  raw: string,
  label: string,
  { required }: { required: boolean },
): { value: number | null; error?: string } {
  const t = text(raw).replace(/,/g, "");
  if (t === "") {
    return required
      ? { value: null, error: `${label} is required.` }
      : { value: null };
  }
  const n = Number(t);
  if (!Number.isFinite(n))
    return { value: null, error: `${label} must be a number.` };
  if (n < 0) return { value: null, error: `${label} cannot be negative.` };
  if (n > 10_000_000)
    return {
      value: null,
      error: `That ${label.toLowerCase()} looks wrong — check it.`,
    };
  // The columns are DECIMAL(10,2): round where the landlord can still see it.
  return { value: Math.round(n * 100) / 100 };
}

/** Build the row, or say what is wrong with the form. */
export function buildUnitUpsert(form: UnitFormValues): UnitFormResult {
  const errors: UnitFormErrors = {};

  const unitNumber = text(form.unit_number);
  if (unitNumber === "") errors.unit_number = "Give the unit a number or name.";
  else if (unitNumber.length > 40)
    errors.unit_number = "Keep it under 40 characters.";

  const unitType = text(form.unit_type);
  if (unitType === "") errors.unit_type = "Choose a unit type.";
  else if (!(UNIT_TYPE_VALUES as readonly string[]).includes(unitType))
    errors.unit_type = "That is not a unit type we can store.";

  const status = text(form.status) || "vacant";
  if (!(UNIT_STATUS_VALUES as readonly string[]).includes(status))
    errors.status = "Choose a status.";

  const furnishing = text(form.furnishing) || "unfurnished";
  if (!(FURNISHING_VALUES as readonly string[]).includes(furnishing))
    errors.furnishing = "Choose a furnishing level.";

  // bedrooms is NOT NULL with a default of 0; a bedsitter really does have 0.
  let bedrooms = 0;
  const bedroomsText = text(form.bedrooms);
  if (bedroomsText === "") {
    bedrooms = BEDROOMS_FOR_TYPE[unitType] ?? 0;
  } else if (!/^\d+$/.test(bedroomsText)) {
    errors.bedrooms = "Bedrooms must be a whole number.";
  } else {
    bedrooms = Number(bedroomsText);
    if (bedrooms > 20)
      errors.bedrooms = "That is more bedrooms than we can store.";
  }

  // bathrooms is DECIMAL(3,1): 1.5 is a real answer, 10.25 is not storable.
  let bathrooms: number | null = null;
  const bathroomsText = text(form.bathrooms);
  if (bathroomsText !== "") {
    const n = Number(bathroomsText);
    if (!Number.isFinite(n)) errors.bathrooms = "Bathrooms must be a number.";
    else if (n < 0) errors.bathrooms = "Bathrooms cannot be negative.";
    else if (n > 20)
      errors.bathrooms = "That is more bathrooms than we can store.";
    else if (Math.round(n * 10) !== n * 10)
      errors.bathrooms = "Bathrooms can go to one decimal place, like 1.5.";
    else bathrooms = n;
  }

  let sizeSqm: number | null = null;
  const sizeText = text(form.size_sqm);
  if (sizeText !== "") {
    const n = Number(sizeText.replace(/,/g, ""));
    if (!Number.isFinite(n)) errors.size_sqm = "Size must be a number.";
    else if (n <= 0) errors.size_sqm = "Size must be more than zero.";
    else if (n > 100_000) errors.size_sqm = "That size looks wrong — check it.";
    else sizeSqm = Math.round(n * 100) / 100;
  }

  const rent = money(form.monthly_rent, "Monthly rent", { required: true });
  if (rent.error) errors.monthly_rent = rent.error;
  else if (rent.value === 0) {
    // valid_rent is CHECK (monthly_rent >= 0), so zero stores — but a unit
    // listed at no rent is almost always a half-filled form, and saying so
    // beats storing it.
    errors.monthly_rent = "Rent cannot be zero. Enter the monthly rent.";
  }

  const deposit = money(form.deposit_amount, "Deposit", { required: false });
  if (deposit.error) errors.deposit_amount = deposit.error;

  const serviceCharge = money(form.service_charge, "Service charge", {
    required: false,
  });
  if (serviceCharge.error) errors.service_charge = serviceCharge.error;

  if (Object.keys(errors).length > 0) return { errors, values: null };

  // Route each ticked feature to the JSONB group it belongs to.
  const chosen = new Set(form.features);
  const group = (name: string): Record<string, boolean> => {
    const out: Record<string, boolean> = {};
    for (const f of UNIT_FEATURES) {
      if (f.group === name) out[f.id] = chosen.has(f.id);
    }
    return out;
  };

  return {
    errors: {},
    values: {
      unit_number: unitNumber,
      unit_type: unitType,
      floor_level: optionalText(form.floor_level),
      wing_block: optionalText(form.wing_block),
      bedrooms,
      bathrooms,
      size_sqm: sizeSqm,
      monthly_rent: rent.value ?? 0,
      deposit_amount: deposit.value,
      service_charge: serviceCharge.value,
      status,
      furnishing,
      // "balcony" is a layout fact, not an amenity group; the column counts them.
      balconies: chosen.has("balcony") ? 1 : 0,
      kitchen_features: group("kitchen_features"),
      bathroom_features: group("bathroom_features"),
      climate_control: group("climate_control"),
      storage_features: group("storage_features"),
      security_features: group("security_features"),
      metadata: optionalText(form.description)
        ? { description: text(form.description) }
        : {},
    },
  };
}

/** Turn a stored unit row back into form values, for the edit screen. */
export function unitRowToForm(row: {
  unit_number: string;
  unit_type: string;
  floor_level: string | null;
  wing_block: string | null;
  bedrooms: number | null;
  bathrooms: number | string | null;
  size_sqm: number | string | null;
  monthly_rent: number | string | null;
  deposit_amount: number | string | null;
  service_charge: number | string | null;
  status: string | null;
  furnishing: string | null;
  balconies: number | null;
  kitchen_features: unknown;
  bathroom_features: unknown;
  climate_control: unknown;
  storage_features: unknown;
  security_features: unknown;
  metadata: unknown;
}): UnitFormValues {
  const str = (v: number | string | null | undefined) =>
    v === null || v === undefined ? "" : String(v);

  const features: string[] = [];
  if ((row.balconies ?? 0) > 0) features.push("balcony");
  for (const f of UNIT_FEATURES) {
    if (f.group === "layout") continue;
    const groupValue = row[f.group as keyof typeof row] as
      | Record<string, unknown>
      | null
      | undefined;
    if (groupValue && groupValue[f.id] === true) features.push(f.id);
  }

  const meta = (row.metadata ?? {}) as Record<string, unknown>;

  return {
    unit_number: row.unit_number ?? "",
    unit_type: row.unit_type ?? "",
    floor_level: row.floor_level ?? "",
    wing_block: row.wing_block ?? "",
    bedrooms: str(row.bedrooms),
    bathrooms: str(row.bathrooms),
    size_sqm: str(row.size_sqm),
    monthly_rent: str(row.monthly_rent),
    deposit_amount: str(row.deposit_amount),
    service_charge: str(row.service_charge),
    status: row.status ?? "vacant",
    furnishing: row.furnishing ?? "unfurnished",
    features,
    description: typeof meta.description === "string" ? meta.description : "",
  };
}
