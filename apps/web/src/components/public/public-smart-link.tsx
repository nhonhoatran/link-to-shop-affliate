import Link from 'next/link';
import type { ComponentPropsWithoutRef } from 'react';
import { isInternalHref, isSafeHref } from '@under30ss/shared';

type PublicSmartLinkProps = Omit<ComponentPropsWithoutRef<'a'>, 'href' | 'rel' | 'target'> & {
  href: string;
  /** Opens external URLs in a new tab; internal paths always stay in the same tab. */
  newTab?: boolean;
};

/**
 * Internal paths go through next/link, external URLs through a plain anchor.
 * `href` should already satisfy `safeHrefSchema`; a value that does not is rendered as inert text so a
 * stale or hand-edited record can never produce a `javascript:` link.
 */
export function PublicSmartLink({ href, newTab = false, children, ...rest }: PublicSmartLinkProps) {
  if (!isSafeHref(href)) return <span className={rest.className}>{children}</span>;
  if (isInternalHref(href)) {
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} rel="noopener noreferrer" {...(newTab ? { target: '_blank' } : {})} {...rest}>
      {children}
    </a>
  );
}
