import { MAX_OUTFIT_LIST_TABS, MAX_SECTION_OUTFITS } from '@under30ss/shared';
import type { FieldSpec } from '../field-spec-types';
import { columns, viewAll } from './common-fields';

export const OUTFIT_LIST_FIELDS: readonly FieldSpec[] = [
    { kind: 'text', name: 'title', label: 'Tiêu đề' },
    {
      kind: 'select',
      name: 'source',
      label: 'Lấy outfit từ',
      options: [
        { value: 'latest', label: 'Outfit mới nhất' },
        { value: 'collection', label: 'Bộ sưu tập' },
        { value: 'manual', label: 'Tự chọn outfit' },
      ],
    },
    {
      kind: 'collections',
      name: 'collectionIds',
      label: 'Bộ sưu tập',
      hint: 'Chọn nhiều bộ sưu tập thì mỗi bộ sưu tập là một tab.',
      max: MAX_OUTFIT_LIST_TABS,
      showIf: (v) => v.source === 'collection',
    },
    { kind: 'outfits', name: 'outfitIds', label: 'Outfit hiển thị', max: MAX_SECTION_OUTFITS, showIf: (v) => v.source === 'manual' },
    {
      kind: 'number',
      name: 'count',
      label: 'Số outfit hiển thị',
      hint: 'Để trống để dùng giá trị mặc định của hệ thống.',
      min: 1,
      optional: true,
      showIf: (v) => v.source !== 'manual',
    },
    {
      kind: 'select',
      name: 'display',
      label: 'Cách hiển thị',
      options: [
        { value: 'carousel', label: 'Trượt ngang' },
        { value: 'grid', label: 'Lưới' },
      ],
    },
    columns((v) => v.display === 'grid'),
    { kind: 'checkbox', name: 'excludeFeatured', label: 'Bỏ outfit nổi bật khỏi danh sách', showIf: (v) => v.source === 'latest' },
    viewAll,
  ];
