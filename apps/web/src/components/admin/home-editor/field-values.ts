export type FieldValues = Record<string, unknown>;

/** `undefined` in a patch removes the key, so optional props go back to "absent" rather than "empty". */
export function applyPatch(values: FieldValues, patch: FieldValues): FieldValues {
  const next: FieldValues = { ...values };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) delete next[key];
    else next[key] = value;
  }
  return next;
}
