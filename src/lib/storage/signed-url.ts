/**
 * Signed-URL helpers for PRIVATE storage buckets.
 *
 * Private buckets must never be read with getPublicUrl(): that returns a URL
 * shaped like a public one which simply 404s, and if the bucket were ever
 * flipped public to "make images work" it would expose every object in it.
 * KYC identity documents (national ID, selfie-with-ID, KRA certificate) live in
 * one of these buckets, so the failure mode is a privacy breach, not a broken
 * image.
 *
 * The rule in this codebase: for a private bucket, persist the STORAGE PATH and
 * mint a short-lived signed URL at read time.
 * https://supabase.com/docs/reference/javascript/storage-from-createsignedurl
 */

import { createAdminClient } from '@/lib/supabase/admin';

/** Buckets whose objects must only ever be served via a signed URL. */
export const PRIVATE_BUCKETS = [
  'provider-documents',
  'dispute-evidence',
  'booking-media',
  'documents',
] as const;

export type PrivateBucket = (typeof PRIVATE_BUCKETS)[number];

/** Default signed-URL lifetime. Short, because these are sensitive objects. */
export const DEFAULT_SIGNED_URL_TTL_SECONDS = 300;

/**
 * Mint a signed URL for one object in a private bucket.
 *
 * Returns null rather than throwing, so a single unreadable document cannot
 * take down a whole admin review page. Callers should render a placeholder.
 *
 * @param path - the stored storage path, NOT a URL. If a legacy absolute URL is
 *   passed it is returned unchanged, so old rows keep rendering while data is
 *   migrated.
 */
export async function createSignedUrl(
  bucket: PrivateBucket,
  path: string | null | undefined,
  expiresInSeconds: number = DEFAULT_SIGNED_URL_TTL_SECONDS
): Promise<string | null> {
  if (!path) return null;

  // Tolerate legacy rows that stored a full URL before this change.
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds);

    if (error || !data?.signedUrl) {
      console.error(`[storage] could not sign ${bucket}/${path}:`, error?.message);
      return null;
    }
    return data.signedUrl;
  } catch (err) {
    console.error(`[storage] signing threw for ${bucket}/${path}:`, err);
    return null;
  }
}

/**
 * Mint signed URLs for several objects in one round trip.
 * Order is preserved; entries that cannot be signed come back as null.
 */
export async function createSignedUrls(
  bucket: PrivateBucket,
  paths: (string | null | undefined)[],
  expiresInSeconds: number = DEFAULT_SIGNED_URL_TTL_SECONDS
): Promise<(string | null)[]> {
  const concrete = paths.filter(
    (p): p is string => !!p && !p.startsWith('http://') && !p.startsWith('https://')
  );
  if (concrete.length === 0) {
    return paths.map((p) => (p && /^https?:\/\//.test(p) ? p : null));
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from(bucket)
      .createSignedUrls(concrete, expiresInSeconds);

    if (error || !data) {
      console.error(`[storage] batch signing failed for ${bucket}:`, error?.message);
      return paths.map((p) => (p && /^https?:\/\//.test(p) ? p : null));
    }

    const byPath = new Map<string, string | null>();
    for (const row of data) {
      if (row.path) byPath.set(row.path, row.signedUrl ?? null);
    }
    return paths.map((p) => {
      if (!p) return null;
      if (/^https?:\/\//.test(p)) return p;
      return byPath.get(p) ?? null;
    });
  } catch (err) {
    console.error(`[storage] batch signing threw for ${bucket}:`, err);
    return paths.map(() => null);
  }
}
