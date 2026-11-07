import Link from 'next/link';
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
        <Link className={styles.link} href={link.href}>
          {link.label}
        </Link>
      ) : null}
    </div>
  );
}
