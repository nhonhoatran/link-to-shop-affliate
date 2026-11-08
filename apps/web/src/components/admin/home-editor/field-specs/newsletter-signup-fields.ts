import type { FieldSpec } from '../field-spec-types';
import { eyebrow } from './common-fields';

export const NEWSLETTER_SIGNUP_FIELDS: readonly FieldSpec[] = [
  { kind: 'text', name: 'heading', label: 'Tiêu đề' },
  eyebrow,
  { kind: 'textarea', name: 'body', label: 'Nội dung', optional: true },
  { kind: 'text', name: 'buttonLabel', label: 'Chữ trên nút' },
  {
    kind: 'text',
    name: 'successMessage',
    label: 'Lời nhắn sau khi đăng ký',
    hint: 'Để trống để dùng câu mặc định.',
    optional: true,
  },
  { kind: 'text', name: 'finePrint', label: 'Dòng chữ nhỏ dưới nút', optional: true },
];
