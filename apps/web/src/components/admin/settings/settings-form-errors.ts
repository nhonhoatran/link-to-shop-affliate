import { REQUIRED_MESSAGE } from '../admin-copy';
import type { FieldErrors } from '../validation-messages';
import type { SettingsFormState } from './settings-form-state';

const GENERIC_MESSAGE = 'Giá trị không hợp lệ';
export const INTERNAL_OR_HTTP_MESSAGE = 'Nhập đường dẫn trong site (bắt đầu bằng /) hoặc link https://';
export const HTTP_ONLY_MESSAGE = 'Nhập link bắt đầu bằng https://';
export const ANNOUNCEMENT_TEXT_REQUIRED = 'Nhập nội dung thông báo';
export const ANNOUNCEMENT_HREF_REQUIRED = 'Nhập đường dẫn cho link';

/**
 * The shared validation messages are generic; replace only those (server messages pass through)
 * with ones that tell the person what to type.
 */
export function localizeSettingsErrors(errors: FieldErrors, state: SettingsFormState): FieldErrors {
  const result: FieldErrors = {};
  for (const [key, message] of Object.entries(errors)) {
    result[key] = message === GENERIC_MESSAGE ? specificMessage(key, state) : message;
  }
  return result;
}

function specificMessage(key: string, state: SettingsFormState): string {
  if (key === 'announcement.text') return ANNOUNCEMENT_TEXT_REQUIRED;
  if (key === 'announcement.href') {
    return state.announcement.href.trim() === '' ? ANNOUNCEMENT_HREF_REQUIRED : INTERNAL_OR_HTTP_MESSAGE;
  }
  const columnLink = /^footer\.columns\.(\d+)\.links\.(\d+)\.href$/.exec(key);
  if (columnLink) {
    const row = state.columns[Number(columnLink[1])]?.links[Number(columnLink[2])];
    return row?.href.trim() ? INTERNAL_OR_HTTP_MESSAGE : REQUIRED_MESSAGE;
  }
  const social = /^footer\.social\.(\d+)\.href$/.exec(key);
  if (social) return state.social[Number(social[1])]?.href.trim() ? HTTP_ONLY_MESSAGE : REQUIRED_MESSAGE;
  return GENERIC_MESSAGE;
}
