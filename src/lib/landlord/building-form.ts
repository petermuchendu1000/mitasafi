/**
 * Validation for the building edit form.
 *
 * WHY THE ALLOWED SETS ARE DERIVED, NOT RETYPED
 *   buildings.building_type, .status and .management_type are CHECK-constrained
 *   columns. A value outside the constraint is not a field error the user can see
 *   — it is a 23514 from Postgres after the request has already been sent, which
 *   surfaces as "something went wrong". The buildings list page shipped with a
 *   label map keyed on three values the constraint does not permit, so this is not
 *   a hypothetical. The allowed sets here are the KEYS of the label maps in
 *   labels.ts, whose comments name the constraint each one mirrors, so a value can
 *   only be offered in the form if it also has a label and is in the constraint.
 *
 * WHAT IS DELIBERATELY NOT VALIDATED
 *   Nothing is checked for "sensible business meaning" beyond range: a landlord
 *   may genuinely own a one-floor building, charge no service charge, or not know
 *   the year it was built. Empty optional fields become NULL rather than 0 or "",
 *   because 0 floors and a blank plot number are claims, and absence is not.
 */

import { buildingTypeLabels, buildingStatusLabels } from "./labels";

/** buildings_management_type_check */
export const managementTypeLabels: Record<string, string> = {
  self: "I manage it myself",
  caretaker: "A caretaker on site",
  property_manager: "A property manager",
};

export const BUILDING_TYPES = Object.keys(buildingTypeLabels);
export const BUILDING_STATUSES = Object.keys(buildingStatusLabels);
export const MANAGEMENT_TYPES = Object.keys(managementTypeLabels);

/** Exactly what the form collects. Numbers arrive as strings from inputs. */
export interface BuildingFormValues {
  name: string;
  building_type: string;
  address: string;
  area: string;
  city: string;
  total_floors: string;
  year_built: string;
  plot_number: string;
  management_type: string;
  service_charge: string;
  status: string;
}

/** What goes to the database: optional fields are null, not "" or 0. */
export interface BuildingUpdate {
  name: string;
  building_type: string;
  address: string;
  area: string;
  city: string | null;
  total_floors: number | null;
  year_built: number | null;
  plot_number: string | null;
  management_type: string;
  service_charge: number | null;
  status: string;
}

export type BuildingFormErrors = Partial<
  Record<keyof BuildingFormValues, string>
>;

export interface ValidationResult {
  errors: BuildingFormErrors;
  /** Present only when errors is empty. */
  update: BuildingUpdate | null;
}

/** An optional whole number within a range; "" and whitespace mean "not set". */
function optionalInteger(
  raw: string,
  min: number,
  max: number,
  label: string,
): { value: number | null; error?: string } {
  const text = raw.trim();
  if (text === "") return { value: null };
  if (!/^-?\d+$/.test(text)) {
    return { value: null, error: `${label} must be a whole number.` };
  }
  const n = Number(text);
  if (n < min || n > max) {
    return {
      value: null,
      error: `${label} must be between ${min} and ${max}.`,
    };
  }
  return { value: n };
}

/**
 * The whole rule set.
 *
 * `currentYear` is a parameter rather than a call to the clock so the upper bound
 * on year_built is testable and does not change under the test suite at New Year.
 */
export function validateBuildingForm(
  values: BuildingFormValues,
  currentYear: number = new Date().getFullYear(),
): ValidationResult {
  const errors: BuildingFormErrors = {};

  const name = values.name.trim();
  if (name.length === 0) errors.name = "Give the building a name.";
  else if (name.length < 2) errors.name = "That name is too short.";
  else if (name.length > 120)
    errors.name = "Keep the name under 120 characters.";

  if (!BUILDING_TYPES.includes(values.building_type)) {
    errors.building_type = "Choose a building type.";
  }

  const address = values.address.trim();
  if (address.length === 0) errors.address = "Give the street address.";
  else if (address.length > 200)
    errors.address = "Keep the address under 200 characters.";

  const area = values.area.trim();
  if (area.length === 0)
    errors.area = "Give the area or estate — tenants search by it.";
  else if (area.length > 80) errors.area = "Keep the area under 80 characters.";

  const city = values.city.trim();
  if (city.length > 80) errors.city = "Keep the city under 80 characters.";

  const floors = optionalInteger(values.total_floors, 1, 200, "Floors");
  if (floors.error) errors.total_floors = floors.error;

  const year = optionalInteger(
    values.year_built,
    1800,
    currentYear + 5,
    "Year built",
  );
  if (year.error) errors.year_built = year.error;

  const plot = values.plot_number.trim();
  if (plot.length > 60)
    errors.plot_number = "Keep the plot number under 60 characters.";

  if (!MANAGEMENT_TYPES.includes(values.management_type)) {
    errors.management_type = "Choose who manages the building.";
  }

  let serviceCharge: number | null = null;
  const chargeText = values.service_charge.trim().replace(/,/g, "");
  if (chargeText !== "") {
    const n = Number(chargeText);
    if (!Number.isFinite(n)) {
      errors.service_charge = "Service charge must be a number.";
    } else if (n < 0) {
      errors.service_charge = "Service charge cannot be negative.";
    } else if (n > 10_000_000) {
      errors.service_charge = "That service charge looks wrong — check it.";
    } else {
      // The column is DECIMAL(10,2); more precision than that is silently lost,
      // so it is rounded here where the user can still see the result.
      serviceCharge = Math.round(n * 100) / 100;
    }
  }

  if (!BUILDING_STATUSES.includes(values.status)) {
    errors.status = "Choose a status.";
  }

  if (Object.keys(errors).length > 0) return { errors, update: null };

  return {
    errors: {},
    update: {
      name,
      building_type: values.building_type,
      address,
      area,
      city: city === "" ? null : city,
      total_floors: floors.value,
      year_built: year.value,
      plot_number: plot === "" ? null : plot,
      management_type: values.management_type,
      service_charge: serviceCharge,
      status: values.status,
    },
  };
}
