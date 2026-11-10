import { z } from 'zod';
import { imageRefSchema, imageWithUrlSchema } from './outfit-schemas';
import { externalHttpUrlSchema, safeHrefSchema } from './safe-href';

// Technical guards on the footer and announcement payloads.
export const MAX_FOOTER_COLUMNS = 4;
export const MAX_FOOTER_LINKS_PER_COLUMN = 8;
export const MAX_FOOTER_SOCIAL_LINKS = 8;
export const MAX_ANNOUNCEMENT_TEXT = 160;
export const MAX_NEWSLETTER_CONSENT_TEXT = 1000;
export const MAX_PRIVACY_LABEL_LENGTH = 40;

export const footerLinkSchema = z.object({
  label: z.string().min(1).max(40),
  href: safeHrefSchema,
});

export const footerSchema = z.object({
  columns: z
    .array(
      z.object({
        title: z.string().min(1).max(40),
        links: z.array(footerLinkSchema).max(MAX_FOOTER_LINKS_PER_COLUMN),
      }),
    )
    .max(MAX_FOOTER_COLUMNS),
  social: z
    .array(z.object({ label: z.string().min(1).max(30), href: externalHttpUrlSchema }))
    .max(MAX_FOOTER_SOCIAL_LINKS),
});

// Site-wide notice bar (shown above the public header), not a home page section.
export const announcementSchema = z
  .object({
    enabled: z.boolean(),
    text: z.string().trim().max(MAX_ANNOUNCEMENT_TEXT),
    linkLabel: z.string().min(1).max(40).optional(),
    href: safeHrefSchema.optional(),
  })
  .superRefine((announcement, ctx) => {
    if (announcement.enabled && announcement.text.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['text'], message: 'An enabled announcement needs text' });
    }
    if (announcement.linkLabel && !announcement.href) {
      ctx.addIssue({ code: 'custom', path: ['href'], message: 'A link label needs a link' });
    }
  });

export const DEFAULT_ANNOUNCEMENT: z.infer<typeof announcementSchema> = { enabled: false, text: '' };

export const publicAnnouncementSchema = z.object({
  text: z.string().min(1),
  linkLabel: z.string().optional(),
  href: z.string().optional(),
});

// Consent sentence next to the newsletter checkbox. Saving a changed text or link bumps the version stored with each
// subscription, so the API owns the version and the input never carries it.
export const newsletterConsentSchema = z.object({
  text: z.string().trim().min(1).max(MAX_NEWSLETTER_CONSENT_TEXT),
  privacyHref: safeHrefSchema.optional(),
  privacyLabel: z.string().trim().min(1).max(MAX_PRIVACY_LABEL_LENGTH).optional(),
});

// Pre-filled in the settings form only; the signup form stays hidden until the admin saves a consent sentence.
export const DEFAULT_NEWSLETTER_CONSENT: z.infer<typeof newsletterConsentSchema> = {
  text: 'Tôi đồng ý nhận email giới thiệu outfit mới và ưu đãi. Tôi có thể huỷ đăng ký bất cứ lúc nào.',
};
export const DEFAULT_PRIVACY_LABEL = 'Chính sách bảo mật';

export const HOME_MODES = ['feed', 'sections'] as const;
export type HomeMode = (typeof HOME_MODES)[number];
// Absent setting = feed: the home page is the swipe feed; 'sections' renders the home builder layout.
export const DEFAULT_HOME_MODE: HomeMode = 'feed';
export const homeModeSchema = z.enum(HOME_MODES);

export const settingsInputSchema = z.object({
  siteName: z.string().min(1).max(80),
  seoTitle: z.string().min(1).max(120),
  seoDescription: z.string().max(300),
  ogImage: imageRefSchema.optional(),
  // Falls back to the UPLOAD_MAX_MB env value when absent.
  uploadMaxMb: z.number().int().positive().optional(),
  // Ceilings come from PUBLIC_PAGE_SIZE_MAX and are checked by the API, like uploadMaxMb.
  looksPageSize: z.number().int().positive().optional(),
  relatedOutfitsCount: z.number().int().positive().optional(),
  // Absent = shown (when at least one collection is published) with DEFAULT_COLLECTIONS_LABEL.
  collectionsNavEnabled: z.boolean().optional(),
  collectionsLabel: z.string().min(1).max(40).optional(),
  homeMode: homeModeSchema.optional(),
  footer: footerSchema.optional(),
  announcement: announcementSchema.optional(),
  newsletterConsent: newsletterConsentSchema.optional(),
});

export const adminSettingsSchema = settingsInputSchema
  .omit({ ogImage: true })
  .extend({
    ogImage: imageWithUrlSchema.optional(),
    updatedAt: z.string().optional(),
    // Read-only: null until a consent sentence has been saved.
    newsletterConsentVersion: z.number().int().min(1).nullable().optional(),
  });

// The chrome fields are optional only so the type can land before the API fills them; the API always sets them.
export const publicSettingsSchema = z.object({
  siteName: z.string(),
  seoTitle: z.string(),
  seoDescription: z.string(),
  ogImageUrl: z.string().nullable(),
  looksPageSize: z.number().int().positive(),
  relatedOutfitsCount: z.number().int().positive(),
  collectionsLabel: z.string().optional(),
  collectionsNavVisible: z.boolean().optional(),
  homeMode: homeModeSchema.optional(),
  footer: footerSchema.optional(),
  announcement: publicAnnouncementSchema.nullable().optional(),
});

export type FooterInput = z.infer<typeof footerSchema>;
export type NewsletterConsentInput = z.infer<typeof newsletterConsentSchema>;
export type AnnouncementInput = z.infer<typeof announcementSchema>;
export type PublicAnnouncementDto = z.infer<typeof publicAnnouncementSchema>;
export type SettingsInput = z.infer<typeof settingsInputSchema>;
export type AdminSettingsDto = z.infer<typeof adminSettingsSchema>;
export type PublicSettingsDto = z.infer<typeof publicSettingsSchema>;
