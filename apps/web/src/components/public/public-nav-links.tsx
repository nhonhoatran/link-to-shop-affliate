'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HOME_PATH } from './home-path';
import type { PublicNavItem } from './public-nav-items';

interface PublicNavLinksProps {
  items: readonly PublicNavItem[];
  label: string;
  className?: string;
  linkClassName?: string;
}

/** Sections such as /collections/<slug> keep their parent link highlighted; "/" only matches itself. */
const isCurrent = (pathname: string, href: string): boolean =>
  pathname === href || (href !== HOME_PATH && pathname.startsWith(`${href}/`));

export function PublicNavLinks({ items, label, className, linkClassName }: PublicNavLinksProps) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className={className}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={linkClassName}
          aria-current={isCurrent(pathname, item.href) ? 'page' : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
