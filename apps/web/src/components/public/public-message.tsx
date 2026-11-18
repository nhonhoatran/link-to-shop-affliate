import Link from 'next/link';
import buttonStyles from './public-button.module.css';
import styles from './public-message.module.css';

export interface PublicMessageProps {
  title: string;
  message: string;
  headingLevel?: 'h1' | 'h2';
  link?: { href: string; label: string };
}

export function PublicMessage({ title, message, link, headingLevel: Heading = 'h1' }: PublicMessageProps) {
  return (
    <div className={styles.box}>
      <Heading className={styles.title}>{title}</Heading>
      <p className={styles.message}>{message}</p>
      {link ? (
        <Link className={`${buttonStyles.button} ${buttonStyles.primary}`} href={link.href}>
          {link.label}
        </Link>
      ) : null}
    </div>
  );
}
