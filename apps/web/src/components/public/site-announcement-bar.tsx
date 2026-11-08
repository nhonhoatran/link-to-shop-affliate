import type { PublicAnnouncementDto } from '@under30ss/shared';
import { PublicSmartLink } from './public-smart-link';
import { SHELL_COPY } from './public-copy';
import styles from './site-announcement-bar.module.css';

export function SiteAnnouncementBar({ announcement }: { announcement: PublicAnnouncementDto }) {
  const { text, linkLabel, href } = announcement;
  return (
    <aside aria-label={SHELL_COPY.announcement} className={styles.bar}>
      <div className={styles.inner}>
        <span className={styles.text}>{text}</span>
        {linkLabel && href ? (
          <PublicSmartLink href={href} className={styles.link}>
            {linkLabel}
          </PublicSmartLink>
        ) : null}
      </div>
    </aside>
  );
}
