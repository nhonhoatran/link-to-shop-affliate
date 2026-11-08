import type { FieldSpec } from '../field-spec-types';
import { altText, ctaHref, ctaLabel, eyebrow } from './common-fields';

export const CAMPAIGN_BANNER_FIELDS: readonly FieldSpec[] = [
  { kind: 'text', name: 'heading', label: 'Tiêu đề' },
  eyebrow,
  { kind: 'textarea', name: 'body', label: 'Nội dung', optional: true },
  { kind: 'image', name: 'image', label: 'Ảnh' },
  altText('Mô tả ngắn cho người khiếm thị.'),
  {
    kind: 'select',
    name: 'imagePosition',
    label: 'Vị trí ảnh',
    options: [
      { value: 'left', label: 'Ảnh bên trái' },
      { value: 'right', label: 'Ảnh bên phải' },
    ],
  },
  ctaLabel,
  ctaHref,
];
