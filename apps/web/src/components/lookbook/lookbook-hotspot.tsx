import type { PublicOutfitItemDto } from '@under30ss/shared';
import { affiliateLinkProps } from './lookbook-link-props';
import styles from './lookbook.module.css';

export function LookbookHotspot({ item }: { item: PublicOutfitItemDto }) {
  return (
    <a
      {...affiliateLinkProps(item.affiliateUrl)}
      className={styles.hotspot}
      data-item-id={item.id}
      data-hotspot
      aria-label={item.name}
      style={{ left: `${item.anchor.x}%`, top: `${item.anchor.y}%` }}
    />
  );
}
