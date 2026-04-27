// =============================================================================
// MITASAFI: CONTENT MODERATION — PROFANITY & ABUSE FILTER
// =============================================================================
// Lightweight server-side content filter for user-generated text (reviews,
// messages, etc.). Uses a curated blocklist of offensive terms common in
// the Kenyan market context (English + Swahili).
//
// Design decisions:
//   - Word-boundary matching to avoid false positives on substrings.
//   - Returns { clean, flagged, matched } so callers can choose to block
//     or auto-flag for admin review.
//   - No external dependencies (no API calls, no ML models) — fast path.
//   - The list is intentionally conservative: we flag rather than censor.
//
// Usage:
//   import { checkContent } from "@/lib/moderation/content-filter";
//   const result = checkContent(text);
//   if (!result.clean) { /* handle */ }
// =============================================================================

/**
 * Result from content moderation check.
 */
export interface ContentFilterResult {
  /** True if no blocked terms were found. */
  clean: boolean;
  /** True if any blocked term matched. */
  flagged: boolean;
  /** The specific terms that matched (empty if clean). */
  matched: string[];
}

// =============================================================================
// BLOCK LIST
// =============================================================================
// Categories:
//   - Hate speech / slurs
//   - Sexual / explicit
//   - Violent / threatening
//   - Scam / fraud indicators
//
// Swahili offensive terms included for the Kenyan market.
// This list is intentionally non-exhaustive; it catches the most common
// patterns. Admin moderation (flag + review) handles edge cases.
// =============================================================================

const BLOCKED_TERMS: string[] = [
  // ── English: Slurs & hate speech ──
  "nigger",
  "nigga",
  "faggot",
  "retard",
  "retarded",
  "tranny",
  "spic",
  "chink",
  "kike",
  "wetback",
  "coon",

  // ── English: Explicit / sexual ──
  "fuck",
  "fucking",
  "fucker",
  "motherfucker",
  "shit",
  "shitty",
  "asshole",
  "bitch",
  "dick",
  "pussy",
  "cock",
  "cunt",
  "whore",
  "slut",
  "bastard",
  "wanker",
  "bollocks",
  "piss",
  "twat",

  // ── English: Threats / violence ──
  "kill you",
  "murder you",
  "i will hurt",
  "burn your",
  "destroy you",

  // ── Swahili: Offensive ──
  "malaya",
  "mkundu",
  "matako",
  "kuma",
  "fala",
  "mjinga",
  "pumbavu",
  "shoga",
  "mshenzi",
  "nyamaza",
  "mafi",
  "umbwa",

  // ── Scam / fraud indicators in reviews ──
  "send money to",
  "wire transfer",
  "western union",
  "moneygram",
  "pay me directly",
  "whatsapp me at",
  "call me on",
  "my number is",
  "contact me at",
];

// =============================================================================
// COMPILED PATTERNS
// =============================================================================

/**
 * Pre-compiled regex patterns for each blocked term.
 * - `\b` word boundaries prevent false positives (e.g., "assume" matching "ass").
 * - Multi-word terms don't use \b between words — they match as phrases.
 * - Case-insensitive.
 */
const COMPILED_PATTERNS: Array<{ term: string; regex: RegExp }> =
  BLOCKED_TERMS.map((term) => {
    // Multi-word phrases: use \b at start and end only
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return {
      term,
      regex: new RegExp(`\\b${escaped}\\b`, "i"),
    };
  });

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Check a text string for blocked / offensive content.
 *
 * @param text - The text to check. Null/empty returns clean.
 * @returns ContentFilterResult with matched terms if flagged.
 *
 * @example
 * ```ts
 * const result = checkContent("Great service, very professional!");
 * // → { clean: true, flagged: false, matched: [] }
 * ```
 */
export function checkContent(text: string | null | undefined): ContentFilterResult {
  if (!text || text.trim().length === 0) {
    return { clean: true, flagged: false, matched: [] };
  }

  const matched: string[] = [];

  for (const { term, regex } of COMPILED_PATTERNS) {
    if (regex.test(text)) {
      matched.push(term);
    }
  }

  return {
    clean: matched.length === 0,
    flagged: matched.length > 0,
    matched,
  };
}

/**
 * Check multiple text fields at once. Returns the combined result.
 * Useful when a review has both title and body text.
 *
 * @param texts - Array of text strings to check.
 * @returns ContentFilterResult with all matched terms across all fields.
 */
export function checkMultipleContent(
  texts: Array<string | null | undefined>
): ContentFilterResult {
  const allMatched: string[] = [];

  for (const text of texts) {
    const result = checkContent(text);
    if (result.flagged) {
      allMatched.push(...result.matched);
    }
  }

  // Deduplicate
  const unique = [...new Set(allMatched)];

  return {
    clean: unique.length === 0,
    flagged: unique.length > 0,
    matched: unique,
  };
}
