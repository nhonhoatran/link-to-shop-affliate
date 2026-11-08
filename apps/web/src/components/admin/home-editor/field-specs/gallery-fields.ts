import { MAX_GALLERY_ITEMS } from '@under30ss/shared';
import type { FieldSpec } from '../field-spec-types';
import { eyebrow } from './common-fields';

export const GALLERY_FIELDS: readonly FieldSpec[] = [
  { kind: 'text', name: 'title', label: 'Tiêu đề' },
  eyebrow,
  { kind: 'text', name: 'note', label: 'Ghi chú ngắn', optional: true },
  {
    kind: 'select',
    name: 'source',
    label: 'Lấy outfit từ',
    options: [
      { value: 'latest', label: 'Outfit mới nhất' },
      { value: 'collection', label: 'Một bộ sưu tập' },
      { value: 'manual', label: 'Tự chọn outfit' },
    ],
  },
  { kind: 'collections', name: 'collectionIds', label: 'Bộ sưu tập', max: 1, showIf: (v) => v.source === 'collection' },
  { kind: 'outfits', name: 'outfitIds', label: 'Outfit hiển thị', max: MAX_GALLERY_ITEMS, showIf: (v) => v.source === 'manual' },
  {
    kind: 'number',
    name: 'count',
    label: 'Số ảnh hiển thị',
    hint: `Tối đa ${MAX_GALLERY_ITEMS}. Số chia hết cho 3 xếp gọn nhất.`,
    min: 1,
    max: MAX_GALLERY_ITEMS,
    showIf: (v) => v.source !== 'manual',
  },
];
