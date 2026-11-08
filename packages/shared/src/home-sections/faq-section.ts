import { z } from 'zod';
import { sectionPropsShape } from './section-common-schemas';

export const MAX_FAQ_ITEMS = 30;

export const faqItemSchema = z.object({
  question: z.string().min(1).max(200),
  answer: z.string().min(1).max(1000),
});

export const faqSectionSchema = z.object({
  type: z.literal('Faq'),
  props: z.object({
    ...sectionPropsShape,
    title: z.string().min(1).max(60),
    items: z.array(faqItemSchema).min(1).max(MAX_FAQ_ITEMS),
  }),
});

export type FaqItem = z.infer<typeof faqItemSchema>;
export type FaqSection = z.infer<typeof faqSectionSchema>;
