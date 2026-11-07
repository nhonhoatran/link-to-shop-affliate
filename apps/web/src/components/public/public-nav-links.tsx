'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { PublicNavItem } from './public-nav-items';

interface PublicNavLinksProps {
  items: readonly PublicNavItem[];
  label: string;
  className?: string;
  linkClassName?: string;
}

export function PublicNavLinks({ items, label, className, linkClassName }: PublicNavLinksProps) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className={className}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={linkClassName}
          aria-current={pathname === item.href ? 'page' : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
