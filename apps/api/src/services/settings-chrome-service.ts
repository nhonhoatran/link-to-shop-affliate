import {
  DEFAULT_ANNOUNCEMENT,
  DEFAULT_COLLECTIONS_LABEL,
  announcementSchema,
  footerSchema,
  type AdminSettingsDto,
  type FooterInput,
  type PublicAnnouncementDto,
  type PublicSettingsDto,
} from '@under30ss/shared';
import { CollectionModel, PUBLISHED_COLLECTION_FILTER } from '../models/collection-model';
import type { SettingsDoc } from '../models/settings-model';

type StoredChrome = Pick<SettingsDoc, 'collectionsNavEnabled' | 'collectionsLabel' | 'footer' | 'announcement'> | null;

const EMPTY_FOOTER: FooterInput = { columns: [], social: [] };

// Stored values were validated on write; parsing again only guards against hand-edited or older documents.
const storedFooter = (stored: StoredChrome): FooterInput | undefined => {
  const parsed = footerSchema.safeParse(stored?.footer);
  return parsed.success ? parsed.data : undefined;
};

const storedAnnouncement = (stored: StoredChrome) => {
  const parsed = announcementSchema.safeParse(stored?.announcement);
  return parsed.success ? parsed.data : DEFAULT_ANNOUNCEMENT;
};

export const toAdminChrome = (
  stored: StoredChrome,
): Pick<AdminSettingsDto, 'collectionsNavEnabled' | 'collectionsLabel' | 'footer' | 'announcement'> => {
  const footer = storedFooter(stored);
  return {
    ...(stored?.collectionsNavEnabled !== undefined ? { collectionsNavEnabled: stored.collectionsNavEnabled } : {}),
    ...(stored?.collectionsLabel ? { collectionsLabel: stored.collectionsLabel } : {}),
    ...(footer ? { footer } : {}),
    announcement: storedAnnouncement(stored),
  };
};

const toPublicAnnouncement = (stored: StoredChrome): PublicAnnouncementDto | null => {
  const { enabled, text, linkLabel, href } = storedAnnouncement(stored);
  if (!enabled || text.length === 0) return null;
  return { text, ...(linkLabel && href ? { linkLabel } : {}), ...(href ? { href } : {}) };
};

/** The nav link needs at least one collection that is actually visible, otherwise it would lead to an empty page. */
export const toPublicChrome = async (
  stored: StoredChrome,
): Promise<Pick<PublicSettingsDto, 'collectionsLabel' | 'collectionsNavVisible' | 'footer' | 'announcement'>> => {
  const enabled = stored?.collectionsNavEnabled ?? true;
  const hasPublished = enabled ? (await CollectionModel.exists(PUBLISHED_COLLECTION_FILTER)) !== null : false;
  return {
    collectionsLabel: stored?.collectionsLabel || DEFAULT_COLLECTIONS_LABEL,
    collectionsNavVisible: hasPublished,
    footer: storedFooter(stored) ?? EMPTY_FOOTER,
    announcement: toPublicAnnouncement(stored),
  };
};
