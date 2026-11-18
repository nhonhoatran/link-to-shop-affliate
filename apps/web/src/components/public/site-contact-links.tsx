import { contactEmailSchema, contactPhoneSchema } from '@under30ss/shared';
import styles from './site-footer.module.css';

interface SiteContactLinksProps {
  email?: string | undefined;
  phone?: string | undefined;
}

export function SiteContactLinks({ email, phone }: SiteContactLinksProps) {
  const parsedEmail = contactEmailSchema.safeParse(email);
  const parsedPhone = contactPhoneSchema.safeParse(phone);
  const emailValue = parsedEmail.success ? parsedEmail.data : '';
  const phoneValue = parsedPhone.success ? parsedPhone.data : '';
  if (!emailValue && !phoneValue) return null;

  return (
    <div>
      <h2 className={styles.columnTitle}>Liên hệ</h2>
      <address className={styles.contact}>
        {emailValue ? (
          <a className={styles.navLink} href={`mailto:${encodeURIComponent(emailValue).replace('%40', '@')}`}>
            {emailValue}
          </a>
        ) : null}
        {phoneValue ? (
          <a className={styles.navLink} href={`tel:${phoneValue.replace(/[^+0-9]/g, '')}`}>
            {phoneValue}
          </a>
        ) : null}
      </address>
    </div>
  );
}
