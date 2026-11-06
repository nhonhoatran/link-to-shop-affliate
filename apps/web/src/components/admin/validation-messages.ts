import type { z } from 'zod';
import { REQUIRED_MESSAGE } from './admin-copy';

export type FieldErrors = Record<string, string>;

type Issue = z.core.$ZodIssue;

const translateIssue = (issue: Issue): string => {
  const last = String(issue.path[issue.path.length - 1] ?? '');
  // A number, not a text length: the generic "ký tự" messages below would be wrong here.
  if (last === 'uploadMaxMb') return 'Nhập số nguyên lớn hơn 0';
  if (issue.code === 'too_small') {
    return issue.minimum === 1 ? REQUIRED_MESSAGE : `Tối thiểu ${String(issue.minimum)} ký tự`;
  }
  if (issue.code === 'invalid_type') return REQUIRED_MESSAGE;
  if (issue.code === 'too_big') return `Tối đa ${String(issue.maximum)} ký tự`;
  if (issue.code === 'invalid_format') {
    return issue.format === 'email' ? 'Email không hợp lệ' : 'Chỉ dùng chữ thường, số và dấu gạch ngang';
  }
  if (issue.code === 'custom') {
    if (last === 'anchor') return 'Chưa đặt điểm trên người mẫu';
    if (last === 'affiliateUrl') {
      // The shared schema reuses `custom` for both "missing" and "not https".
      return issue.message.includes('https') ? 'Link phải là địa chỉ https:// hợp lệ' : 'Thiếu link affiliate';
    }
    if (last === 'id') return 'Mã món bị trùng';
  }
  return 'Giá trị không hợp lệ';
};

/** Flattens zod issues into `path.joined.by.dots -> Vietnamese message`, first issue per path wins. */
export const issuesToFieldErrors = (issues: readonly Issue[]): FieldErrors => {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path.join('.');
    if (!(key in errors)) errors[key] = translateIssue(issue);
  }
  return errors;
};

/** Picks `prefix + name` entries and strips the prefix: scopeErrors(e, 'items.2.') -> { name, ... }. */
export const scopeErrors = (errors: FieldErrors, prefix: string): FieldErrors =>
  Object.fromEntries(
    Object.entries(errors)
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, message]) => [key.slice(prefix.length), message]),
  );
