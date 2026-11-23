/**
 * Turning the Add Building wizard's form state into a `buildings` row.
 *
 * WHAT THIS REPLACES
 *   The wizard's submit handler was:
 *
 *     await new Promise((resolve) => setTimeout(resolve, 1500));
 *     console.log("Saving building:", formData);
 *     alert("Building saved successfully! 🎉");
 *     router.push("/dashboard/landlord/buildings");
 *
 *   A 1.5-second pause, a log, a congratulatory alert, and a redirect to a list
 *   that would not contain it. Five steps of input — name, address, amenities,
 *   policies, photos, bank details — were discarded, and the user was told it
 *   had worked. "Save draft" did the same thing with a different alert.
 *
 * WHY THE MAPPING IS A MODULE AND NOT INLINE IN THE ACTION
 *   Fourteen columns and seven JSONB groups, three of them CHECK-constrained,
 *   and a photos array that must not contain what the wizard currently puts in
 *   it. That is a lot of ways to be quietly wrong, and none of them are visible
 *   from the UI — a bad enum surfaces as a 23514 after the request, which reads
 *   to the user as "something went wrong". Here it is one pure function with
 *   tests and no database.
 *
 * THE PHOTOS GUARD IS THE IMPORTANT ONE
 *   Step 4 reads files with `FileReader.readAsDataURL`, so `formData.photos`
 *   holds base64 `data:` URLs of up to 5MB each. Writing those into the TEXT[]
 *   column would put megabytes of base64 into every row and render nothing,
 *   because the column is read as a list of URLs. This function REFUSES a
 *   data: URL rather than storing it; the caller uploads to the
 *   property-photos bucket first and passes the public URLs.
 */

import type { BuildingFormData } from "@/app/dashboard/landlord/buildings/new/types";
import type { Json } from "@/types/database";

/** buildings_building_type_check */
const BUILDING_TYPE_VALUES = [
  "apartment",
  "flat_block",
  "townhouse_complex",
  "gated_community",
  "student_hostel",
  "mixed_use",
  "other",
];

/** buildings_management_type_check */
const MANAGEMENT_TYPE_VALUES = ["self", "caretaker", "property_manager"];

/** The row handed to supabase.from("buildings").insert(). */
export interface BuildingInsert {
  landlord_id: string;
  name: string;
  building_type: string;
  address: string;
  area: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  total_floors: number | null;
  total_units: number;
  year_built: number | null;
  plot_number: string | null;
  landmarks: string | null;
  access_instructions: string | null;
  security_features: Json;
  water_power: Json;
  parking: Json;
  common_facilities: Json;
  services: Json;
  policies: Json;
  photos: string[];
  cover_photo: string | null;
  service_charge: number | null;
  service_charge_includes: string[];
  collection_via_mitasafi: boolean;
  bank_details: Json;
  management_type: string;
  status: string;
}

export type SubmissionErrors = Record<string, string>;

export interface SubmissionResult {
  errors: SubmissionErrors;
  /** Present only when errors is empty. */
  insert: BuildingInsert | null;
}

/** Trim, and treat an all-whitespace string as absent. */
function text(value: string | undefined | null): string {
  return (value ?? "").trim();
}

function optionalText(value: string | undefined | null): string | null {
  const t = text(value);
  return t === "" ? null : t;
}

/**
 * An optional whole number within a range.
 *
 * The wizard's inputs are typed `number | undefined`, but a number input that
 * has been typed into and cleared yields NaN, which is a number as far as
 * TypeScript is concerned and would reach the database as null-ish nonsense.
 */
function optionalInt(
  value: number | undefined,
  min: number,
  max: number,
  label: string,
  errors: SubmissionErrors,
  field: string,
): number | null {
  if (value === undefined || value === null) return null;
  // Number.isInteger is false for NaN and for Infinity as well as for 2.5, so
  // it covers a cleared number input on its own. An explicit isFinite check
  // above it was dead code: a mutation run removed it and no test noticed,
  // which is exactly what an unreachable branch looks like.
  if (!Number.isInteger(value)) {
    errors[field] = `${label} must be a whole number.`;
    return null;
  }
  if (value < min || value > max) {
    errors[field] = `${label} must be between ${min} and ${max}.`;
    return null;
  }
  return value;
}

/** Is this something the photos column can usefully hold? */
function isStorableUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || value.startsWith("/");
}

/**
 * Build the insert, or report what is wrong with the form.
 *
 * `currentYear` is a parameter so the upper bound on year_built does not move
 * under the test suite at midnight on New Year's Eve.
 */
export function buildBuildingInsert(
  form: BuildingFormData,
  landlordId: string,
  currentYear: number = new Date().getFullYear(),
): SubmissionResult {
  const errors: SubmissionErrors = {};

  if (!text(landlordId)) {
    errors.landlord = "You are not signed in.";
  }

  const name = text(form.name);
  if (name === "") errors.name = "Give the building a name.";
  else if (name.length > 120)
    errors.name = "Keep the name under 120 characters.";

  const buildingType = text(form.building_type);
  if (buildingType === "") {
    errors.building_type = "Choose a building type.";
  } else if (!BUILDING_TYPE_VALUES.includes(buildingType)) {
    errors.building_type = "That is not a building type we can store.";
  }

  const address = text(form.address);
  if (address === "") errors.address = "Give the street address.";
  else if (address.length > 200)
    errors.address = "Keep the address under 200 characters.";

  const area = text(form.area);
  if (area === "")
    errors.area = "Give the area or estate — tenants search by it.";
  else if (area.length > 80) errors.area = "Keep the area under 80 characters.";

  const managementType = text(form.management_type) || "self";
  if (!MANAGEMENT_TYPE_VALUES.includes(managementType)) {
    errors.management_type = "Choose who manages the building.";
  }

  const totalFloors = optionalInt(
    form.total_floors,
    1,
    200,
    "Floors",
    errors,
    "total_floors",
  );
  const declaredUnits = optionalInt(
    form.total_units,
    0,
    10000,
    "Units",
    errors,
    "total_units",
  );
  const yearBuilt = optionalInt(
    form.year_built,
    1800,
    currentYear + 5,
    "Year built",
    errors,
    "year_built",
  );

  // The column is DECIMAL(10,8) / DECIMAL(11,8): a value outside these ranges
  // is not merely wrong, it overflows the column and the insert fails.
  let latitude: number | null = null;
  if (form.latitude !== undefined && form.latitude !== null) {
    if (!Number.isFinite(form.latitude) || Math.abs(form.latitude) > 90) {
      errors.latitude = "That location is not a valid latitude.";
    } else {
      latitude = form.latitude;
    }
  }
  let longitude: number | null = null;
  if (form.longitude !== undefined && form.longitude !== null) {
    if (!Number.isFinite(form.longitude) || Math.abs(form.longitude) > 180) {
      errors.longitude = "That location is not a valid longitude.";
    } else {
      longitude = form.longitude;
    }
  }

  let serviceCharge: number | null = null;
  if (form.service_charge !== undefined && form.service_charge !== null) {
    if (!Number.isFinite(form.service_charge)) {
      errors.service_charge = "Service charge must be a number.";
    } else if (form.service_charge < 0) {
      errors.service_charge = "Service charge cannot be negative.";
    } else if (form.service_charge > 10_000_000) {
      errors.service_charge = "That service charge looks wrong — check it.";
    } else {
      // DECIMAL(10,2) truncates silently; round where the caller can still see it.
      serviceCharge = Math.round(form.service_charge * 100) / 100;
    }
  }

  // See the note at the top of this file: a data: URL here means the caller
  // skipped the upload step, and storing it would put megabytes of base64 in
  // the row and render nothing.
  const photos = (form.photos ?? []).filter((p) => text(p) !== "");
  if (photos.some((p) => !isStorableUrl(p))) {
    errors.photos =
      "Those photos have not finished uploading. Try again in a moment.";
  }

  // A cover photo that is not one of the photos would render as a missing
  // image on the card and nowhere else, which is hard to notice and harder to
  // explain. Falling back to the first photo is what the user meant.
  let coverPhoto: string | null = null;
  const declaredCover = optionalText(form.cover_photo);
  if (declaredCover && photos.includes(declaredCover)) {
    coverPhoto = declaredCover;
  } else if (photos.length > 0) {
    coverPhoto = photos[0];
  }

  if (Object.keys(errors).length > 0) return { errors, insert: null };

  return {
    errors: {},
    insert: {
      landlord_id: landlordId,
      name,
      building_type: buildingType,
      address,
      area,
      city: optionalText(form.city),
      latitude,
      longitude,
      total_floors: totalFloors,
      // NOT nullable in practice: the column defaults to 0 and the building
      // detail page compares it against the units actually recorded, warning
      // when they disagree. Storing what the landlord declared is the point of
      // that comparison.
      total_units: declaredUnits ?? 0,
      year_built: yearBuilt,
      plot_number: optionalText(form.plot_number),
      landmarks: optionalText(form.landmarks),
      access_instructions: optionalText(form.access_instructions),
      security_features: { ...form.security_features },
      water_power: { ...form.water_power },
      parking: { ...form.parking },
      common_facilities: { ...form.common_facilities },
      services: { ...form.services },
      policies: { ...form.policies },
      photos,
      cover_photo: coverPhoto,
      service_charge: serviceCharge,
      service_charge_includes: form.service_charge_includes ?? [],
      collection_via_mitasafi: form.collection_via_mitasafi !== false,
      bank_details: { ...form.bank_details },
      management_type: managementType,
      // A building created through the wizard is one the landlord is managing
      // now. There is no 'draft' in buildings_status_check.
      status: "active",
    },
  };
}

/**
 * Turn one of Step 4's base64 data URLs back into a file for upload.
 *
 * Step 4 holds photos as `data:image/jpeg;base64,...` strings rather than the
 * original File objects, so recovering a blob is what lets the upload happen at
 * submit time without restructuring that step.
 *
 * Returns null for anything that is not a data URL — including a URL that has
 * already been uploaded, which is how a retry skips work it has already done.
 */
export function dataUrlToBlob(dataUrl: string): Blob | null {
  // [\s\S] rather than the /s flag: the dotAll flag needs an es2018
  // target and this project compiles below that.
  const match = /^data:([^;,]+)(;base64)?,([\s\S]*)$/.exec(dataUrl);
  if (!match) return null;

  const mime = match[1] || "application/octet-stream";
  const isBase64 = Boolean(match[2]);
  const payload = match[3];

  try {
    if (!isBase64) {
      return new Blob([decodeURIComponent(payload)], { type: mime });
    }
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

/** The file extension to store a given image mime type under. */
export function extensionForMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/gif": "gif",
  };
  return map[mime.toLowerCase()] ?? "jpg";
}
