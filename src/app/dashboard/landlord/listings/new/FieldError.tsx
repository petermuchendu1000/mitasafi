"use client";

/**
 * One field's validation message, and the aria that ties it to its control.
 *
 * WHY THIS EXISTS RATHER THAN HAND-WIRING EACH FIELD
 *   The previous per-field pass on this wizard produced two WRONG pairings: a
 *   label for "Rent Amount" was attached to the currency <select> sitting in
 *   front of the amount input, which announces the currency dropdown as "Rent
 *   Amount" — worse than leaving it bare. The failure mode was manual matching
 *   of three things that had to agree: the error key, the control, and the id
 *   joining them.
 *
 *   Here the id is DERIVED from the error key, and the control's aria comes
 *   from the same key through `fieldErrorProps`. There is one source of truth,
 *   so the control and the message cannot disagree about which id to use. A
 *   mis-pairing now requires passing the wrong key in two places at once,
 *   which a reader can see on one line.
 *
 * THE SUMMARY STILL CARRIES THE WHOLE LIST
 *   StepValidationSummary announces everything outstanding on the step. This
 *   puts the same message next to the field it belongs to, which is what a
 *   sighted user scanning a long form needs, and sets aria-invalid, which the
 *   summary cannot do on the control's behalf.
 *
 * NO NEW RULES
 *   This renders a message the wizard already produced. It validates nothing.
 */

/** The id of the message for a field. The single source of truth. */
export function fieldErrorId(field: string): string {
  return `${field}-error`;
}

/**
 * Spread onto the control: `{...fieldErrorProps("rentAmount", errors.rentAmount)}`.
 * Returns nothing when the field is fine, so a valid control carries no stale
 * aria-describedby pointing at an element that is not rendered.
 */
export function fieldErrorProps(
  field: string,
  error?: string | null,
): { "aria-invalid"?: true; "aria-describedby"?: string } {
  if (!error) return {};
  return { "aria-invalid": true, "aria-describedby": fieldErrorId(field) };
}

export function FieldError({
  field,
  error,
  className,
}: {
  field: string;
  error?: string | null;
  className?: string;
}) {
  if (!error) return null;
  return (
    <p
      id={fieldErrorId(field)}
      className={className ?? "text-xs text-red-600 mt-1.5"}
    >
      {error}
    </p>
  );
}
