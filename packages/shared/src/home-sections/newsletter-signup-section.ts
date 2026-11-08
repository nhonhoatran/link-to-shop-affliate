import { z } from 'zod';
import { eyebrowSchema, sectionPropsShape } from './section-common-schemas';

// The consent sentence is a site setting (newsletterConsent), not a section prop.
export const newsletterSignupSectionSchema = z.object({
  type: z.literal('NewsletterSignup'),
  props: z.object({
    ...sectionPropsShape,
    eyebrow: eyebrowSchema,
    heading: z.string().min(1).max(80),
    body: z.string().max(300).optional(),
    buttonLabel: z.string().min(1).max(30),
    // Empty = the default sentence in the web copy.
    successMessage: z.string().max(160).optional(),
    finePrint: z.string().max(160).optional(),
  }),
});

export type NewsletterSignupSection = z.infer<typeof newsletterSignupSectionSchema>;
