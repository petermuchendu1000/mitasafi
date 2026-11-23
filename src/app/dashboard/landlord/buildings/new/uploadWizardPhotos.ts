"use client";

/**
 * Getting Step 4's photos out of React state and into storage.
 *
 * WHY THIS IS NEEDED AT ALL
 *   Step 4 reads each file with `FileReader.readAsDataURL`, so `formData.photos`
 *   holds base64 `data:` strings of up to 5MB each rather than File objects.
 *   The buildings.photos column is TEXT[] read as a list of URLs. Writing a
 *   data: URL there stores megabytes of base64 per row and renders nothing, so
 *   buildBuildingInsert refuses them and this runs first.
 *
 * WHY THE UPLOAD IS CLIENT-SIDE
 *   A server action would have to carry the base64 in its request body, and
 *   Next's server action body limit is 1MB by default — a single photo would
 *   exceed it. Uploading from the browser with the user's own JWT also means
 *   storage RLS applies rather than being bypassed by a service-role client.
 *
 * WHY THE PATH STARTS WITH `listings/`
 *   The storage policy on property-photos is
 *     (storage.foldername(name))[1] = 'listings'
 *     AND (storage.foldername(name))[2] = auth.uid()::text
 *   so `listings/<uid>/...` is the only prefix an authenticated client may
 *   write. The segment is a policy constraint, not a description of the
 *   contents; `buildings/` under it keeps the objects identifiable. Widening
 *   the policy to a real `buildings/` prefix is a migration, not a code change,
 *   and is deliberately not bundled into this one.
 */

import { createClient } from "@/lib/supabase/client";
import {
  dataUrlToBlob,
  extensionForMime,
} from "@/lib/landlord/building-submission";

const BUCKET = "property-photos";
const MAX_BYTES = 5 * 1024 * 1024;

export interface UploadOutcome {
  /** The photos list with every data: URL replaced by its public URL. */
  photos: string[];
  /** The cover photo, mapped through the same replacement. */
  coverPhoto: string | undefined;
  /** Human-readable reasons, one per photo that could not be uploaded. */
  failures: string[];
}

/**
 * Upload every data: URL in `photos`, leaving already-uploaded URLs alone.
 *
 * Returning the already-uploaded ones untouched is what makes a retry cheap
 * after a partial failure: the second attempt only does the work the first one
 * did not finish.
 *
 * `onProgress` is called with (done, total) counting only the photos that
 * actually needed uploading.
 */
export async function uploadWizardPhotos(
  photos: string[],
  coverPhoto: string | undefined,
  onProgress?: (done: number, total: number) => void,
): Promise<UploadOutcome> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pending = photos.filter((p) => p.startsWith("data:"));
  if (pending.length === 0) {
    return { photos, coverPhoto, failures: [] };
  }

  if (!user) {
    return {
      photos,
      coverPhoto,
      failures: ["You are not signed in, so the photos could not be uploaded."],
    };
  }

  const failures: string[] = [];
  /** old value -> new value, so the cover photo can be remapped too. */
  const replaced = new Map<string, string>();
  let done = 0;

  for (const [index, original] of photos.entries()) {
    if (!original.startsWith("data:")) continue;

    const blob = dataUrlToBlob(original);
    if (!blob) {
      failures.push(`Photo ${index + 1} could not be read.`);
      done += 1;
      onProgress?.(done, pending.length);
      continue;
    }
    if (blob.size > MAX_BYTES) {
      failures.push(`Photo ${index + 1} is larger than 5MB.`);
      done += 1;
      onProgress?.(done, pending.length);
      continue;
    }

    const ext = extensionForMime(blob.type);
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const path = `listings/${user.id}/buildings/${unique}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { cacheControl: "3600", upsert: false });

    if (error) {
      failures.push(`Photo ${index + 1} failed to upload: ${error.message}`);
    } else {
      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(path);
      replaced.set(original, publicUrl);
    }

    done += 1;
    onProgress?.(done, pending.length);
  }

  return {
    // Photos that failed keep their data: URL, so the user still sees them in
    // the grid and can retry rather than silently losing them.
    photos: photos.map((p) => replaced.get(p) ?? p),
    coverPhoto: coverPhoto
      ? (replaced.get(coverPhoto) ?? coverPhoto)
      : undefined,
    failures,
  };
}
