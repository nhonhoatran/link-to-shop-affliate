import { COLLECTIONS_PAGE_PATH, DEFAULT_COLLECTIONS_LABEL, LOOKS_PAGE_PATH } from '@under30ss/shared';
import { HOME_PATH } from './home-path';
import { NAV_LABELS } from './public-copy';

export interface PublicNavItem {
  href: string;
  label: string;
}

export interface NavSettings {
  collectionsNavVisible?: boolean | undefined;
  collectionsLabel?: string | undefined;
}

export { HOME_PATH };

/** One list for header and footer so label and order never differ between them. */
export function buildPublicNavItems({ collectionsNavVisible, collectionsLabel }: NavSettings = {}): PublicNavItem[] {
  const items: PublicNavItem[] = [
    { href: HOME_PATH, label: NAV_LABELS.home },
    { href: LOOKS_PAGE_PATH, label: NAV_LABELS.looks },
  ];
  if (collectionsNavVisible) {
    items.push({ href: COLLECTIONS_PAGE_PATH, label: collectionsLabel || DEFAULT_COLLECTIONS_LABEL });
  }
  return items;
}
