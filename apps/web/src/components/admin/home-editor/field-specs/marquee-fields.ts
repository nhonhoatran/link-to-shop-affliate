import { MAX_MARQUEE_ITEMS, MAX_MARQUEE_SECONDS, MIN_MARQUEE_SECONDS, HOME_SECTION_DEFAULTS } from '@under30ss/shared';
import type { FieldSpec } from '../field-spec-types';

const MARQUEE_ITEM = HOME_SECTION_DEFAULTS.Marquee.items[0] ?? { text: '' };

export const MARQUEE_FIELDS: readonly FieldSpec[] = [
  {
    kind: 'text',
    name: 'label',
    label: 'Tên dải chữ',
    hint: 'Không bắt buộc. Dành cho người dùng trình đọc màn hình.',
    optional: true,
  },
  {
    kind: 'array',
    name: 'items',
    label: 'Các cụm chữ',
    itemLabel: 'Cụm chữ',
    min: 1,
    max: MAX_MARQUEE_ITEMS,
    create: () => ({ ...MARQUEE_ITEM }),
    fields: [{ kind: 'text', name: 'text', label: 'Chữ hiển thị' }],
  },
  {
    kind: 'number',
    name: 'durationSeconds',
    label: 'Thời gian chạy hết một vòng (giây)',
    hint: `Từ ${MIN_MARQUEE_SECONDS} đến ${MAX_MARQUEE_SECONDS} giây. Số càng lớn chạy càng chậm.`,
    min: MIN_MARQUEE_SECONDS,
    max: MAX_MARQUEE_SECONDS,
  },
];
