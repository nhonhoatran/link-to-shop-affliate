import { LOOKS_PAGE_PATH } from '@under30ss/shared';
import { NAV_LABELS } from './public-copy';

export interface PublicNavItem {
  href: string;
  label: string;
}

export const HOME_PATH = '/';

export const PUBLIC_NAV_ITEMS: readonly PublicNavItem[] = [
  { href: HOME_PATH, label: NAV_LABELS.home },
  { href: LOOKS_PAGE_PATH, label: NAV_LABELS.looks },
];
