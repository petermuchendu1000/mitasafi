/**
 * Deciding which selected files the photo step may accept.
 *
 * WHY THIS IS SEPARATE FROM THE COMPONENT
 *   The bug this was extracted to fix was not in the rules — it was in reading
 *   a live FileList asynchronously. The rules themselves (how many, how big,
 *   what type) are worth stating once where they can be tested without a
 *   browser, and the component is left with the part that genuinely needs one.
 *
 * THE SHAPE MATTERS: the caller must get back a plain ARRAY.
 *   `input.files` is a live FileList tied to the input element. Step 4's change
 *   handler resets `input.value = ""` immediately after handing that FileList
 *   on, which empties it — so any code that reads `files.length` later, inside
 *   a FileReader callback, sees 0. That is exactly what went wrong: the guard
 *   `newPhotos.length === files.length` compared 1 against 0 and the photo was
 *   silently dropped. Returning an array snapshots it.
 */

export interface PhotoSelection {
  /** Files that passed every rule, as a plain array, in selection order. */
  accepted: File[];
  /** One message per rejected file, ready to show. */
  rejected: string[];
}

export interface PhotoSelectionLimits {
  maxPhotos: number;
  maxBytes: number;
  acceptedTypes: readonly string[];
}

export const DEFAULT_PHOTO_LIMITS: PhotoSelectionLimits = {
  maxPhotos: 20,
  maxBytes: 5 * 1024 * 1024,
  acceptedTypes: ["image/jpeg", "image/png", "image/webp"],
};

/** Bytes as the upload hint phrases them. */
function mb(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))}MB`;
}

/**
 * Filter a selection against the limits, counting what is already there.
 *
 * Files over the remaining slot count are rejected INDIVIDUALLY rather than the
 * whole selection being refused: dropping twenty-five photos when twenty fit
 * should keep twenty, not zero.
 */
export function selectPhotos(
  existingCount: number,
  files: ArrayLike<File> | null | undefined,
  limits: PhotoSelectionLimits = DEFAULT_PHOTO_LIMITS,
): PhotoSelection {
  const accepted: File[] = [];
  const rejected: string[] = [];

  if (!files || files.length === 0) return { accepted, rejected };

  // Array.from here is the snapshot: everything below works on a copy, not on
  // the live FileList the input owns.
  const incoming = Array.from(files);
  let remaining = Math.max(0, limits.maxPhotos - existingCount);

  for (const file of incoming) {
    if (remaining === 0) {
      rejected.push(
        `${file.name}: you can have at most ${limits.maxPhotos} photos.`,
      );
      continue;
    }
    if (!limits.acceptedTypes.includes(file.type.toLowerCase())) {
      rejected.push(`${file.name}: only JPEG, PNG and WebP images.`);
      continue;
    }
    if (file.size > limits.maxBytes) {
      rejected.push(`${file.name}: larger than ${mb(limits.maxBytes)}.`);
      continue;
    }
    accepted.push(file);
    remaining -= 1;
  }

  return { accepted, rejected };
}
