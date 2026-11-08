import {
  HOME_SECTION_DEFAULTS,
  MAX_COMMITMENTS,
  MAX_FAQ_ITEMS,
  MAX_SECTION_COLLECTIONS,
  MIN_COMMITMENTS,
  type HomeSectionType,
} from '@under30ss/shared';
import { COMMITMENT_ICON_OPTIONS } from './home-editor-copy';
import type { FieldSpec } from './field-spec-types';
import { CAMPAIGN_BANNER_FIELDS } from './field-specs/campaign-banner-fields';
import { altText, columns, ctaHref, ctaLabel, eyebrow, viewAll } from './field-specs/common-fields';
import { GALLERY_FIELDS } from './field-specs/gallery-fields';
import { MARQUEE_FIELDS } from './field-specs/marquee-fields';
import { NEWSLETTER_SIGNUP_FIELDS } from './field-specs/newsletter-signup-fields';
import { HERO_SLIDER_FIELDS } from './field-specs/hero-slider-fields';
import { OUTFIT_LIST_FIELDS } from './field-specs/outfit-list-fields';

const FAQ_ITEM = HOME_SECTION_DEFAULTS.Faq.items[0] ?? { question: '', answer: '' };
const COMMITMENT_ITEM = HOME_SECTION_DEFAULTS.Commitments.items[0] ?? { icon: COMMITMENT_ICON_OPTIONS[0]?.value, title: '', text: '' };

export const HOME_SECTION_FIELD_SPECS: Record<HomeSectionType, readonly FieldSpec[]> = {
  HeroSlider: HERO_SLIDER_FIELDS,
  CollectionTiles: [
    { kind: 'text', name: 'title', label: 'Tiêu đề' },
    eyebrow,
    {
      kind: 'select',
      name: 'mode',
      label: 'Cách chọn bộ sưu tập',
      options: [
        { value: 'auto', label: 'Tự lấy theo thứ tự bộ sưu tập' },
        { value: 'manual', label: 'Tự chọn' },
      ],
    },
    {
      kind: 'collections',
      name: 'collectionIds',
      label: 'Bộ sưu tập hiển thị',
      max: MAX_SECTION_COLLECTIONS,
      showIf: (v) => v.mode === 'manual',
    },
    { kind: 'number', name: 'count', label: 'Số bộ sưu tập hiển thị', min: 1, showIf: (v) => v.mode !== 'manual' },
    columns(),
    viewAll,
  ],
  OutfitList: OUTFIT_LIST_FIELDS,
  FeaturedLookbook: [
    {
      kind: 'select',
      name: 'source',
      label: 'Outfit hiển thị',
      options: [
        { value: 'featured', label: 'Outfit nổi bật hiện tại' },
        { value: 'manual', label: 'Tự chọn outfit' },
      ],
    },
    { kind: 'outfit', name: 'outfitId', label: 'Outfit', max: 1, showIf: (v) => v.source === 'manual' },
  ],
  TextWithImage: [
    { kind: 'text', name: 'heading', label: 'Tiêu đề' },
    eyebrow,
    { kind: 'textarea', name: 'body', label: 'Nội dung', hint: 'Cách đoạn bằng một dòng trống.' },
    { kind: 'image', name: 'image', label: 'Ảnh (không bắt buộc)', optional: true },
    { ...altText('Mô tả ngắn cho người khiếm thị.'), optional: true, showIf: (v) => v.image !== undefined },
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
  ],
  Faq: [
    { kind: 'text', name: 'title', label: 'Tiêu đề' },
    eyebrow,
    {
      kind: 'array',
      name: 'items',
      label: 'Các câu hỏi',
      itemLabel: 'Câu hỏi',
      min: 1,
      max: MAX_FAQ_ITEMS,
      create: () => ({ ...FAQ_ITEM }),
      fields: [
        { kind: 'text', name: 'question', label: 'Câu hỏi' },
        { kind: 'textarea', name: 'answer', label: 'Trả lời' },
      ],
    },
  ],
  Commitments: [
    {
      kind: 'array',
      name: 'items',
      label: 'Các cam kết',
      itemLabel: 'Cam kết',
      min: MIN_COMMITMENTS,
      max: MAX_COMMITMENTS,
      create: () => ({ ...COMMITMENT_ITEM }),
      fields: [
        { kind: 'select', name: 'icon', label: 'Biểu tượng', options: COMMITMENT_ICON_OPTIONS },
        { kind: 'text', name: 'title', label: 'Tiêu đề ngắn' },
        { kind: 'text', name: 'text', label: 'Mô tả' },
      ],
    },
  ],
  CampaignBanner: CAMPAIGN_BANNER_FIELDS,
  Marquee: MARQUEE_FIELDS,
  Gallery: GALLERY_FIELDS,
  NewsletterSignup: NEWSLETTER_SIGNUP_FIELDS,
};
