/**
 * The categories and urgencies a repair may carry.
 *
 * A plain module, not the server action file: a "use server" module may only
 * export async functions, and importing one into a client component drags
 * next/cache in with it. Both the action and the form read these from here,
 * so the list the tenant is offered and the list the action accepts cannot
 * drift apart.
 *
 * Both lists mirror CHECK constraints on maintenance_requests. A value not
 * in them is refused by the database with error 23514, which means nothing
 * to a tenant — so they are checked before the insert as well.
 */

/** maintenance_requests_category_check. */
export const REPAIR_CATEGORIES = [
  "plumbing",
  "electrical",
  "hvac",
  "appliances",
  "structural",
  "locks_security",
  "painting",
  "pest_control",
  "general",
  "other",
] as const;

/** maintenance_requests_urgency_check. */
export const REPAIR_URGENCIES = ["emergency", "high", "normal", "low"] as const;

export const CATEGORY_LABEL: Record<string, string> = {
  plumbing: "Plumbing",
  electrical: "Electrical",
  hvac: "Heating or cooling",
  appliances: "Appliances",
  structural: "Structural",
  locks_security: "Locks or security",
  painting: "Painting",
  pest_control: "Pests",
  general: "General",
  other: "Other",
};
