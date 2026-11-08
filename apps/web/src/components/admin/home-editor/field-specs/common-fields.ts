import { MAX_GRID_COLUMNS, MIN_GRID_COLUMNS } from '@under30ss/shared';
import type { FieldSpec, TextSpec } from '../field-spec-types';

const COLUMN_OPTIONS = Array.from({ length: MAX_GRID_COLUMNS - MIN_GRID_COLUMNS + 1 }, (_, i) => ({
  value: MIN_GRID_COLUMNS + i,
  label: `${MIN_GRID_COLUMNS + i} cột`,
}));

export const columns = (showIf?: FieldSpec['showIf']): FieldSpec => ({
  kind: 'select',
  name: 'columnsDesktop',
  label: 'Số cột trên máy tính',
  options: COLUMN_OPTIONS,
  ...(showIf ? { showIf } : {}),
});

export const viewAll: FieldSpec = { kind: 'checkbox', name: 'showViewAll', label: 'Hiện nút "Xem tất cả"' };
export const ctaLabel: FieldSpec = { kind: 'text', name: 'ctaLabel', label: 'Chữ trên nút', optional: true };
export const ctaHref: FieldSpec = {
  kind: 'text',
  name: 'ctaHref',
  label: 'Link của nút',
  hint: 'Đường dẫn trong trang (ví dụ /looks) hoặc địa chỉ https://…',
  optional: true,
};
export const altText = (hint: string): TextSpec => ({ kind: 'text', name: 'alt', label: 'Mô tả ảnh', hint });
