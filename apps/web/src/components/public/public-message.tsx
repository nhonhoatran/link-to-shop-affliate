import Link from 'next/link';
import buttonStyles from './public-button.module.css';
import styles from './public-message.module.css';

export interface PublicMessageProps {
  title: string;
  message: string;
  link?: { href: string; label: string };
}

export function PublicMessage({ title, message, link }: PublicMessageProps) {
  return (
    <div className={styles.box}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.message}>{message}</p>
      {link ? (
        <Link className={`${buttonStyles.button} ${buttonStyles.primary}`} href={link.href}>
          {link.label}
        </Link>
      ) : null}
    </div>
  );
}
