import { MAX_HERO_AUTOPLAY_SECONDS, MAX_HERO_SLIDES, MIN_HERO_AUTOPLAY_SECONDS } from '@under30ss/shared';
import type { FieldSpec } from '../field-spec-types';
import { altText, ctaHref, ctaLabel } from './common-fields';

export const HERO_SLIDER_FIELDS: readonly FieldSpec[] = [
    { kind: 'text', name: 'label', label: 'Tên banner', hint: 'Không bắt buộc. Dành cho người dùng trình đọc màn hình.', optional: true },
    {
      kind: 'array',
      name: 'slides',
      label: 'Các ảnh banner',
      itemLabel: 'Ảnh banner',
      min: 1,
      max: MAX_HERO_SLIDES,
      createFromImage: (image) => ({ image, alt: '' }),
      fields: [
        { kind: 'image', name: 'image', label: 'Ảnh' },
        { kind: 'image', name: 'mobileImage', label: 'Ảnh riêng cho điện thoại (không bắt buộc)', optional: true },
        altText('Mô tả ngắn cho người khiếm thị và khi ảnh không tải được.'),
        { kind: 'text', name: 'heading', label: 'Tiêu đề', optional: true },
        { kind: 'textarea', name: 'text', label: 'Dòng giới thiệu', optional: true },
        ctaLabel,
        ctaHref,
      ],
    },
    {
      kind: 'number',
      name: 'autoplaySeconds',
      label: 'Tự chuyển ảnh sau (giây)',
      hint: `Nhập 0 để tắt tự chuyển, hoặc từ ${MIN_HERO_AUTOPLAY_SECONDS} đến ${MAX_HERO_AUTOPLAY_SECONDS} giây.`,
      min: 0,
      max: MAX_HERO_AUTOPLAY_SECONDS,
    },
  ];
