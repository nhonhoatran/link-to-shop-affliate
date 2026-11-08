import type { z } from 'zod';
import {
  homeSectionSchema,
  MAX_HERO_AUTOPLAY_SECONDS,
  MIN_HERO_AUTOPLAY_SECONDS,
  saveHomeDraftRequestSchema,
  type HomeSection,
} from '@under30ss/shared';
import { REQUIRED_MESSAGE } from '../admin-copy';
import { issuesToFieldErrors, scopeErrors, type FieldErrors } from '../validation-messages';

type Issue = z.core.$ZodIssue;

const HREF_MESSAGE = 'Link không hợp lệ. Dùng đường dẫn như /looks hoặc địa chỉ https://…';

const messageFor = (issue: Issue): string | null => {
  const last = String(issue.path[issue.path.length - 1] ?? '');
  if (issue.code === 'too_small' && issue.origin === 'array') {
    return issue.minimum === 1 ? REQUIRED_MESSAGE : `Cần ít nhất ${String(issue.minimum)} mục`;
  }
  if (issue.code === 'too_big' && issue.origin === 'array') return `Tối đa ${String(issue.maximum)} mục`;
  if (issue.code === 'custom' && last.endsWith('Href')) return HREF_MESSAGE;
  if (issue.code === 'custom' && last === 'autoplaySeconds') {
    return `Nhập 0 để tắt, hoặc từ ${MIN_HERO_AUTOPLAY_SECONDS} đến ${MAX_HERO_AUTOPLAY_SECONDS} giây`;
  }
  if (issue.code === 'invalid_type' && issue.expected === 'number') return 'Nhập một số';
  if (issue.code === 'too_small' && issue.origin === 'number') return `Nhập số từ ${String(issue.minimum)} trở lên`;
  if (issue.code === 'too_big' && issue.origin === 'number') return `Nhập số không quá ${String(issue.maximum)}`;
  if (issue.code === 'invalid_value') return 'Chọn một giá trị trong danh sách';
  return null;
};

/** Dotted path -> Vietnamese message; first issue per path wins. */
export function mapLayoutIssues(issues: readonly Issue[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path.join('.');
    if (key in errors) continue;
    errors[key] = messageFor(issue) ?? issuesToFieldErrors([issue])[key] ?? '';
  }
  return errors;
}

/** Keys look like `content.{i}.props.{field}`, the same paths the API reports. */
export function validateLayout(content: readonly HomeSection[]): FieldErrors {
  const parsed = saveHomeDraftRequestSchema.safeParse({ content, baseUpdatedAt: null });
  return parsed.success ? {} : mapLayoutIssues(parsed.error.issues);
}

/** Keys relative to the section's props, e.g. `slides.0.alt`. */
export function validateSection(section: HomeSection): FieldErrors {
  const parsed = homeSectionSchema.safeParse(section);
  return parsed.success ? {} : scopeErrors(mapLayoutIssues(parsed.error.issues), 'props.');
}

export const sectionErrors = (errors: FieldErrors, index: number): FieldErrors =>
  scopeErrors(errors, `content.${index}.props.`);

export function sectionIdsWithErrors(errors: FieldErrors, content: readonly HomeSection[]): Set<string> {
  const ids = new Set<string>();
  for (const key of Object.keys(errors)) {
    const index = /^content\.(\d+)\./.exec(key)?.[1];
    const id = index === undefined ? undefined : content[Number(index)]?.props.id;
    if (id) ids.add(id);
  }
  return ids;
}

export function firstErrorSectionId(errors: FieldErrors, content: readonly HomeSection[]): string | null {
  const bad = sectionIdsWithErrors(errors, content);
  return content.find((section) => bad.has(section.props.id))?.props.id ?? null;
}
