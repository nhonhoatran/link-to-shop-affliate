import type { FooterInput } from '@under30ss/shared';
import { SHELL_COPY } from './public-copy';
import { PublicSmartLink } from './public-smart-link';
import styles from './site-footer.module.css';

/** Text links: lucide-react ships no brand icons. */
export function SiteSocialLinks({ social }: { social: FooterInput['social'] }) {
  if (social.length === 0) return null;
  return (
    <ul aria-label={SHELL_COPY.socialLinks} className={styles.social}>
      {social.map((link, index) => (
        <li key={`${index}-${link.href}`}>
          <PublicSmartLink href={link.href} newTab className={styles.socialLink}>
            {link.label}
          </PublicSmartLink>
        </li>
      ))}
    </ul>
  );
}
