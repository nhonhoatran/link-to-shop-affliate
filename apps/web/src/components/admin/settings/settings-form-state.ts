import { DEFAULT_NEWSLETTER_CONSENT, type AdminSettingsDto, type ImageWithUrl, type SettingsInput } from '@under30ss/shared';

export interface LinkRow {
  key: number;
  label: string;
  href: string;
}

export interface FooterColumnRow {
  key: number;
  title: string;
  links: LinkRow[];
}

export interface AnnouncementValues {
  enabled: boolean;
  text: string;
  linkLabel: string;
  href: string;
}

export interface NewsletterConsentValues {
  /** Off omits the sentence from the PUT, which hides the signup form on the homepage. */
  enabled: boolean;
  text: string;
  privacyHref: string;
  privacyLabel: string;
}

export interface SettingsFormState {
  siteName: string;
  seoTitle: string;
  seoDescription: string;
  uploadMaxMb: string;
  looksPageSize: string;
  relatedOutfitsCount: string;
  ogImage: ImageWithUrl | undefined;
  collectionsNavEnabled: boolean;
  collectionsLabel: string;
  announcement: AnnouncementValues;
  newsletterConsent: NewsletterConsentValues;
  columns: FooterColumnRow[];
  social: LinkRow[];
}

// React keys only: never rendered, so values need not match between server and client.
let nextKey = 0;
export const newRowKey = (): number => ++nextKey;

export const emptyLink = (): LinkRow => ({ key: newRowKey(), label: '', href: '' });
export const emptyColumn = (): FooterColumnRow => ({ key: newRowKey(), title: '', links: [emptyLink()] });

const toRow = (link: { label: string; href: string }): LinkRow => ({ key: newRowKey(), ...link });

export function fromAdminSettings(initial: AdminSettingsDto): SettingsFormState {
  return {
    siteName: initial.siteName,
    seoTitle: initial.seoTitle,
    seoDescription: initial.seoDescription,
    uploadMaxMb: initial.uploadMaxMb?.toString() ?? '',
    looksPageSize: initial.looksPageSize?.toString() ?? '',
    relatedOutfitsCount: initial.relatedOutfitsCount?.toString() ?? '',
    ogImage: initial.ogImage,
    collectionsNavEnabled: initial.collectionsNavEnabled ?? true,
    collectionsLabel: initial.collectionsLabel ?? '',
    announcement: {
      enabled: initial.announcement?.enabled ?? false,
      text: initial.announcement?.text ?? '',
      linkLabel: initial.announcement?.linkLabel ?? '',
      href: initial.announcement?.href ?? '',
    },
    // Pre-filled with the default sentence until one has been saved.
    newsletterConsent: {
      enabled: initial.newsletterConsent !== undefined,
      text: initial.newsletterConsent?.text ?? DEFAULT_NEWSLETTER_CONSENT.text,
      privacyHref: initial.newsletterConsent?.privacyHref ?? '',
      privacyLabel: initial.newsletterConsent?.privacyLabel ?? '',
    },
    columns: (initial.footer?.columns ?? []).map((column) => ({
      key: newRowKey(),
      title: column.title,
      links: column.links.map(toRow),
    })),
    social: (initial.footer?.social ?? []).map(toRow),
  };
}

const parseOptional = (value: string): number | undefined => (value.trim() === '' ? undefined : Number(value));

const link = ({ label, href }: LinkRow) => ({ label: label.trim(), href: href.trim() });

/** Always sends every key: PUT replaces the whole document, so an omitted key would be wiped. */
export function toSettingsInput(state: SettingsFormState): unknown {
  const { announcement } = state;
  const uploadMaxMb = parseOptional(state.uploadMaxMb);
  const looksPageSize = parseOptional(state.looksPageSize);
  const relatedOutfitsCount = parseOptional(state.relatedOutfitsCount);
  const collectionsLabel = state.collectionsLabel.trim();
  const linkLabel = announcement.linkLabel.trim();
  const href = announcement.href.trim();
  const consent = state.newsletterConsent;
  const privacyHref = consent.privacyHref.trim();
  const privacyLabel = consent.privacyLabel.trim();
  const input: SettingsInput = {
    siteName: state.siteName,
    seoTitle: state.seoTitle,
    seoDescription: state.seoDescription,
    ...(state.ogImage
      ? { ogImage: { key: state.ogImage.key, width: state.ogImage.width, height: state.ogImage.height } }
      : {}),
    ...(uploadMaxMb === undefined ? {} : { uploadMaxMb }),
    ...(looksPageSize === undefined ? {} : { looksPageSize }),
    ...(relatedOutfitsCount === undefined ? {} : { relatedOutfitsCount }),
    collectionsNavEnabled: state.collectionsNavEnabled,
    ...(collectionsLabel === '' ? {} : { collectionsLabel }),
    footer: {
      columns: state.columns.map((column) => ({ title: column.title.trim(), links: column.links.map(link) })),
      social: state.social.map(link),
    },
    ...(consent.enabled
      ? {
          newsletterConsent: {
            text: consent.text,
            ...(privacyHref === '' ? {} : { privacyHref }),
            ...(privacyLabel === '' ? {} : { privacyLabel }),
          },
        }
      : {}),
    announcement: {
      enabled: announcement.enabled,
      text: announcement.text,
      ...(linkLabel === '' ? {} : { linkLabel }),
      ...(href === '' ? {} : { href }),
    },
  };
  return input;
}
