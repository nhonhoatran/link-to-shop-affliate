import { z } from 'zod';
import { sectionPropsShape } from './section-common-schemas';

// Keys of lucide-react icons (verified in lucide-react@1.70.0); the web app maps key -> component.
export const COMMITMENT_ICONS = [
  'truck',
  'shield-check',
  'refresh-ccw',
  'sparkles',
  'heart',
  'gift',
  'tag',
  'badge-check',
  'package-check',
  'headset',
  'award',
  'message-circle',
] as const;

export const MIN_COMMITMENTS = 2;
export const MAX_COMMITMENTS = 4;

export const commitmentIconSchema = z.enum(COMMITMENT_ICONS);

export const commitmentItemSchema = z.object({
  icon: commitmentIconSchema,
  title: z.string().min(1).max(40),
  text: z.string().min(1).max(120),
});

export const commitmentsSectionSchema = z.object({
  type: z.literal('Commitments'),
  props: z.object({
    ...sectionPropsShape,
    items: z.array(commitmentItemSchema).min(MIN_COMMITMENTS).max(MAX_COMMITMENTS),
  }),
});

export type CommitmentIcon = z.infer<typeof commitmentIconSchema>;
export type CommitmentItem = z.infer<typeof commitmentItemSchema>;
export type CommitmentsSection = z.infer<typeof commitmentsSectionSchema>;
