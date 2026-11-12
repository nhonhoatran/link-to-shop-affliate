'use client';

import { useId } from 'react';
import Image from 'next/image';
import { ShoppingBag, X } from 'lucide-react';
import type { PublicOutfitItemDto } from '@under30ss/shared';
import { affiliateLinkProps } from '@/components/lookbook/lookbook-link-props';
import { FEED_COPY } from '@/components/public/public-copy';
import { useModalDialog } from '@/hooks/use-modal-dialog';
import { FEED_SHEET_THUMB_SIZES } from './feed-photo-sizes';
import styles from './feed-post-controls.module.css';
import postStyles from './feed-post.module.css';
import sheetStyles from './feed-shop-sheet.module.css';

/** "Mua đồ" rail button opening a bottom sheet with every item and its shop link. */
export function FeedShopSheet({ items }: { items: readonly PublicOutfitItemDto[] }) {
  const { dialogRef, open, close, onDialogClose, onDialogClick } = useModalDialog();
  const titleId = useId();
  if (items.length === 0) return null;

  return (
    <>
      <button
        type="button"
        className={`${styles.railButton} ${styles.needsScript}`}
        aria-label={FEED_COPY.shopLabel(items.length)}
        aria-haspopup="dialog"
        onClick={open}
      >
        <ShoppingBag aria-hidden="true" focusable="false" />
        <span className={styles.badge} aria-hidden="true">
          {items.length}
        </span>
      </button>
      <dialog
        ref={dialogRef}
        className={sheetStyles.sheet}
        aria-labelledby={titleId}
        onClose={onDialogClose}
        onClick={onDialogClick}
      >
        <div className={sheetStyles.body}>
          <div className={sheetStyles.header}>
            <h2 id={titleId} className={sheetStyles.title}>
              {FEED_COPY.itemsTitle}
            </h2>
            <button type="button" className={sheetStyles.close} aria-label={FEED_COPY.closeSheet} onClick={close}>
              <X aria-hidden="true" focusable="false" />
            </button>
          </div>
          <ul className={sheetStyles.list}>
            {items.map((item) => (
              <li key={item.id} className={sheetStyles.item}>
                <Image
                  src={item.image.url}
                  alt=""
                  width={item.image.width}
                  height={item.image.height}
                  sizes={FEED_SHEET_THUMB_SIZES}
                  className={sheetStyles.thumb}
                />
                <span className={sheetStyles.text}>
                  <span className={sheetStyles.name}>{item.name}</span>
                  {item.subtitle ? <span className={sheetStyles.subtitle}>{item.subtitle}</span> : null}
                </span>
                <a {...affiliateLinkProps(item.affiliateUrl)} className={postStyles.buy} aria-label={FEED_COPY.buyLabel(item.name)}>
                  {FEED_COPY.buy}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </dialog>
    </>
  );
}
