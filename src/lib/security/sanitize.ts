// =============================================================================
// MITASAFI: INPUT SANITIZATION
// =============================================================================
// Server-side sanitization for user-provided inputs.
//
// These functions strip dangerous content before database writes.
// They complement (not replace) parameterized queries, which are
// already handled by Supabase client's `.eq()`, `.insert()`, etc.
//
// Usage:
//   import { sanitizeText, sanitizeSearchQuery } from "@/lib/security/sanitize";
//   const clean = sanitizeText(userInput, 500);
// =============================================================================

/**
 * Strip HTML tags and limit length.
 *
 * Used for free-text fields (notes, bio, descriptions).
 */
export function sanitizeText(input: string | null | undefined, maxLength = 1000): string {
  if (!input) return "";

  return (
    input
      // Strip HTML tags
      .replace(/<[^>]*>/g, "")
      // Collapse whitespace
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxLength)
  );
}

/**
 * Sanitize a search query.
 *
 * Strips characters that could interfere with SQL ILIKE patterns
 * or PostgreSQL full-text search while preserving natural language.
 */
export function sanitizeSearchQuery(input: string | null | undefined, maxLength = 200): string {
  if (!input) return "";

  return (
    input
      // Remove null bytes
      .replace(/\0/g, "")
      // Strip HTML
      .replace(/<[^>]*>/g, "")
      // Remove SQL wildcards that could expand ILIKE patterns
      .replace(/[%_]/g, "")
      // Keep only safe characters: letters, numbers, spaces, hyphens, apostrophes
      .replace(/[^\p{L}\p{N}\s\-']/gu, "")
      // Collapse whitespace
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxLength)
  );
}

/**
 * Validate and sanitize a UUID string.
 *
 * Returns null if the input is not a valid UUID v4.
 */
export function sanitizeUUID(input: string | null | undefined): string | null {
  if (!input) return null;
  const uuid = input.trim().toLowerCase();
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  return UUID_RE.test(uuid) ? uuid : null;
}

/**
 * Sanitize a slug (URL-safe identifier).
 *
 * Only lowercase letters, numbers, and hyphens.
 */
export function sanitizeSlug(input: string | null | undefined, maxLength = 100): string {
  if (!input) return "";
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, maxLength);
}

/**
 * Sanitize a numeric string into a bounded integer.
 *
 * Returns the fallback if input is not a valid number or out of range.
 */
export function sanitizeInt(
  input: string | null | undefined,
  { min = 0, max = 10000, fallback = 0 }: { min?: number; max?: number; fallback?: number } = {}
): number {
  if (!input) return fallback;
  const num = parseInt(input, 10);
  if (isNaN(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}
