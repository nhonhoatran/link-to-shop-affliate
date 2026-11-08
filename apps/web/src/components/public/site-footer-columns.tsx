import type { FooterInput } from '@under30ss/shared';
import { PublicSmartLink } from './public-smart-link';
import styles from './site-footer.module.css';

export function SiteFooterColumns({ columns }: { columns: FooterInput['columns'] }) {
  if (columns.length === 0) return null;
  return (
    <div className={styles.columns}>
      {columns.map((column, index) => (
        <div key={`${index}-${column.title}`}>
          <h2 className={styles.columnTitle}>{column.title}</h2>
          <ul className={styles.linkList}>
            {column.links.map((link, linkIndex) => (
              <li key={`${linkIndex}-${link.href}`}>
                <PublicSmartLink href={link.href} className={styles.navLink}>
                  {link.label}
                </PublicSmartLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
