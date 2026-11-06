import type { AnchorHTMLAttributes } from 'react';
import { affiliateUrlSchema } from '@under30ss/shared';

export const AFFILIATE_REL = 'sponsored nofollow noopener noreferrer';

/**
 * Shared by the item card and its hotspot so both always point at the same place.
 * Anything that is not an https:// URL renders like an empty link, so a bad value in the
 * database can never become a javascript:/http: href.
 */
export function affiliateLinkProps(affiliateUrl: string): AnchorHTMLAttributes<HTMLAnchorElement> {
  const href = affiliateUrl.trim();
  if (!href || !affiliateUrlSchema.safeParse(href).success) return { href: '#', 'aria-disabled': true };
  return { href, target: '_blank', rel: AFFILIATE_REL };
}
