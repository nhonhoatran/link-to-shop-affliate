import { z } from 'zod';

// Technical bound (matches affiliateUrlSchema), not a business value.
export const SAFE_HREF_MAX_LENGTH = 2048;

const WHITESPACE = /\s/;
const LAST_CONTROL_CHAR_CODE = 0x1f;
const DELETE_CHAR_CODE = 0x7f;
const ABSOLUTE_HTTP_URL = /^https?:\/\/[^/\\?#]/i;

export const isInternalHref = (value: string): boolean => value.startsWith('/') && !value.startsWith('//');

const hasWhitespaceOrControl = (value: string): boolean =>
  [...value].some((char) => {
    const code = char.codePointAt(0) ?? 0;
    return code <= LAST_CONTROL_CHAR_CODE || code === DELETE_CHAR_CODE || WHITESPACE.test(char);
  });

const isAbsoluteHttpUrl = (value: string): boolean => {
  if (!ABSOLUTE_HTTP_URL.test(value)) return false;
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
};

// Rejects javascript:, data:, protocol-relative (//host) and backslash tricks (/\host) that browsers
// normalise into another origin.
export const isSafeHref = (value: string): boolean => {
  if (value.length === 0 || value.length > SAFE_HREF_MAX_LENGTH) return false;
  if (hasWhitespaceOrControl(value) || value.includes('\\')) return false;
  return value.startsWith('/') ? isInternalHref(value) : isAbsoluteHttpUrl(value);
};

export const safeHrefSchema = z
  .string()
  .max(SAFE_HREF_MAX_LENGTH)
  .refine(isSafeHref, 'Link must be an internal path or an http(s) URL');

export const externalHttpUrlSchema = z
  .string()
  .max(SAFE_HREF_MAX_LENGTH)
  .refine((value) => isSafeHref(value) && !value.startsWith('/'), 'Link must be an http(s) URL');
