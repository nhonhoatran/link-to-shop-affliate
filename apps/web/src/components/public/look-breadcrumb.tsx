import { LOOKS_PAGE_PATH } from '@under30ss/shared';
import { NAV_LABELS } from './public-copy';
import { HOME_PATH } from './public-nav-items';
import { PublicBreadcrumb } from './public-breadcrumb';

export function LookBreadcrumb({ title }: { title: string }) {
  return (
    <PublicBreadcrumb
      trail={[
        { label: NAV_LABELS.home, href: HOME_PATH },
        { label: NAV_LABELS.looks, href: LOOKS_PAGE_PATH },
        { label: title },
      ]}
    />
  );
}
