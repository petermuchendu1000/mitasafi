/**
 * Landing image URLs — derived from the configured Supabase project, never
 * hardcoded to one.
 *
 * WHY THIS EXISTS
 *
 * Every marketing image on the site used to carry a full, literal URL pointing
 * at Supabase project `syoolvgoaqnckgmngvse` — 39 references across 11 files,
 * including next.config.ts's image allowlist and layout.tsx's OpenGraph image.
 * That project no longer exists: its hostname does not resolve, so every
 * `/_next/image` request for it returned 500 and every photograph on the
 * marketing pages was broken, as was the social-preview card.
 *
 * Nothing in the codebase referenced the live project. The ref was pinned in
 * source, so moving projects — which had already happened — silently broke the
 * whole visual layer with no error anywhere that a developer would see.
 *
 * The fix is to stop naming a project at all. The base is built from
 * NEXT_PUBLIC_SUPABASE_URL, which is already required for the app to function,
 * so the images follow the database automatically.
 */

/**
 * Public storage base for the `landing-images` bucket.
 *
 * NEXT_PUBLIC_SUPABASE_URL is inlined at build time by Next, so this is a
 * constant in the client bundle rather than a runtime lookup. The trailing
 * slash is trimmed because callers pass paths without a leading one.
 */
export const LANDING_IMAGES_BASE = `${(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
).replace(/\/+$/, "")}/storage/v1/object/public/landing-images`;

/**
 * Build the public URL for an object in the `landing-images` bucket.
 *
 * @param path Path within the bucket, e.g. `"hero/nairobi-skyline-1.jpg"`.
 *             No leading slash.
 */
export function landingImage(path: string): string {
  return `${LANDING_IMAGES_BASE}/${path.replace(/^\/+/, "")}`;
}
