/**
 * Human labels for the landlord tables' enumerated columns.
 *
 * Every map here is keyed on exactly the values a CHECK constraint permits, and the
 * comment above each one names the constraint. That matters because the mock pages
 * these replace were keyed on values the database cannot hold — "apartment_block",
 * "gated_compound", "commercial_building" for building_type; a "draft" building
 * status; a three-way unit status when the column has four. A lookup that misses
 * renders blank, so a map that disagrees with its constraint is a screen that is
 * empty for every real row.
 *
 * Keeping them in one module rather than per page is what stops the two from
 * drifting apart again: the list page and the detail page now read the same map.
 */

/** buildings_building_type_check */
export const buildingTypeLabels: Record<string, string> = {
  apartment: "Apartment Building",
  flat_block: "Flat Block",
  townhouse_complex: "Townhouse Complex",
  gated_community: "Gated Community",
  student_hostel: "Student Hostel",
  mixed_use: "Mixed Use",
  other: "Other",
};

/** buildings_status_check */
export const buildingStatusLabels: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  archived: "Archived",
};

/** units_unit_type_check */
export const unitTypeLabels: Record<string, string> = {
  bedsitter: "Bedsitter",
  studio: "Studio",
  "1br": "1 Bedroom",
  "2br": "2 Bedroom",
  "3br": "3 Bedroom",
  "4br": "4 Bedroom",
  "5br_plus": "5+ Bedroom",
  penthouse: "Penthouse",
  duplex: "Duplex",
  loft: "Loft",
  house: "House",
  townhouse: "Townhouse",
  villa: "Villa",
  maisonette: "Maisonette",
  bungalow: "Bungalow",
};

/** A short form for table cells, where "3 Bedroom" is wider than the column. */
export const unitTypeShortLabels: Record<string, string> = {
  bedsitter: "Bedsitter",
  studio: "Studio",
  "1br": "1 BR",
  "2br": "2 BR",
  "3br": "3 BR",
  "4br": "4 BR",
  "5br_plus": "5+ BR",
  penthouse: "Penthouse",
  duplex: "Duplex",
  loft: "Loft",
  house: "House",
  townhouse: "Townhouse",
  villa: "Villa",
  maisonette: "Maisonette",
  bungalow: "Bungalow",
};

/**
 * units_status_check — all FOUR values.
 *
 * The page this replaces had three, omitting 'reserved'. A reserved unit would have
 * crashed the lookup chain (`statusConfig[unit.status].bgColor` on undefined), not
 * merely rendered oddly.
 */
export type UnitStatus = "vacant" | "occupied" | "maintenance" | "reserved";

export const unitStatusLabels: Record<UnitStatus, string> = {
  vacant: "Vacant",
  occupied: "Occupied",
  maintenance: "Maintenance",
  reserved: "Reserved",
};

/** units_listing_status_check */
export const unitListingStatusLabels: Record<string, string> = {
  unlisted: "Not listed",
  listed: "Listed",
  reserved: "Reserved",
};

/** leases_status_check */
export const leaseStatusLabels: Record<string, string> = {
  draft: "Draft",
  pending_signature: "Awaiting signature",
  active: "Active",
  expired: "Expired",
  terminated: "Terminated",
  renewed: "Renewed",
};

/** maintenance_requests_category_check */
export const maintenanceCategoryLabels: Record<string, string> = {
  plumbing: "Plumbing",
  electrical: "Electrical",
  hvac: "HVAC",
  appliances: "Appliances",
  structural: "Structural",
  locks_security: "Locks & security",
  painting: "Painting",
  pest_control: "Pest control",
  general: "General",
  other: "Other",
};

/** maintenance_requests_status_check */
export const maintenanceStatusLabels: Record<string, string> = {
  open: "Open",
  acknowledged: "Acknowledged",
  assigned: "Assigned",
  in_progress: "In progress",
  completed: "Completed",
  closed: "Closed",
  cancelled: "Cancelled",
};

/** maintenance_requests_urgency_check */
export const maintenanceUrgencyLabels: Record<string, string> = {
  emergency: "Emergency",
  high: "High",
  normal: "Normal",
  low: "Low",
};

/** payments_payment_method_check, and leases_payment_method_check less 'mixed'. */
export const paymentMethodLabels: Record<string, string> = {
  mpesa: "M-Pesa",
  bank: "Bank transfer",
  cash: "Cash",
  cheque: "Cheque",
  mixed: "Mixed",
  other: "Other",
};

/** tenants_verification_level_check */
export const verificationLevelLabels: Record<string, string> = {
  basic: "Unverified",
  phone_verified: "Phone verified",
  id_verified: "ID verified",
  employment_verified: "Employment verified",
  reference_checked: "References checked",
  credit_checked: "Credit checked",
};

/**
 * A label for a value that may not be in its map.
 *
 * The database can hold a value a deploy has not caught up with, and an empty cell
 * is worse than an unpolished one, so an unknown value is shown rather than hidden.
 */
export function labelFor(
  map: Record<string, string>,
  value: string | null | undefined,
  fallback = "—",
): string {
  if (!value) return fallback;
  return map[value] ?? value.replace(/_/g, " ");
}

/** KES with thousands separators and no decimals. */
export function formatKes(amount: number): string {
  return `KES ${Math.round(amount).toLocaleString("en-KE")}`;
}

/** KES rounded to thousands, for stat tiles where the full number does not fit. */
export function formatKesCompact(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `KES ${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  if (Math.abs(amount) >= 1000) {
    return `KES ${Math.round(amount / 1000)}k`;
  }
  return `KES ${Math.round(amount)}`;
}
