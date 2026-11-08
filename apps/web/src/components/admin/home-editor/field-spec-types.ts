import type { FieldValues } from './field-values';

interface BaseSpec {
  name: string;
  label: string;
  hint?: string;
  /** Hidden fields keep their stored value; they only stop being editable. */
  showIf?: (values: FieldValues) => boolean;
}

export interface TextSpec extends BaseSpec {
  kind: 'text' | 'textarea';
  /** Empty input removes the prop instead of storing an empty string. */
  optional?: boolean;
}

export interface NumberSpec extends BaseSpec {
  kind: 'number';
  min: number;
  max?: number;
  optional?: boolean;
}

export interface SelectSpec extends BaseSpec {
  kind: 'select';
  options: readonly { value: string | number; label: string }[];
}

export interface CheckboxSpec extends BaseSpec {
  kind: 'checkbox';
}

export interface ImageSpec extends BaseSpec {
  kind: 'image';
  optional?: boolean;
}

/** `outfit` holds a single id (string), the others an ordered list of ids. */
export interface EntitySpec extends BaseSpec {
  kind: 'outfits' | 'collections' | 'outfit';
  max: number;
}

export interface ArraySpec extends BaseSpec {
  kind: 'array';
  itemLabel: string;
  min: number;
  max: number;
  fields: readonly FieldSpec[];
  /** The "add" button creates an item from this. */
  create?: () => FieldValues;
  /** Instead of a button, items are created by uploading an image. */
  createFromImage?: (image: FieldValues) => FieldValues;
}

export type FieldSpec = TextSpec | NumberSpec | SelectSpec | CheckboxSpec | ImageSpec | EntitySpec | ArraySpec;
