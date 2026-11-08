import type { HomeSectionOf } from '@under30ss/shared';
import { FaqJsonLdScript } from '@/lib/seo/faq-json-ld-script';
import { SectionShell, type SectionViewProps } from './section-shell';
import styles from './faq.module.css';

export function FaqView({ section, headingId, mode }: SectionViewProps<HomeSectionOf<'Faq'>>) {
  const { id, eyebrow, title, items } = section.props;
  return (
    <SectionShell sectionId={id} headingId={headingId} eyebrow={eyebrow} title={title}>
      {mode === 'public' ? <FaqJsonLdScript items={items} /> : null}
      <ul className={styles.list}>
        {items.map((item, index) => (
          <li key={index}>
            <details className={styles.item}>
              <summary className={styles.question}>{item.question}</summary>
              <p className={styles.answer}>{item.answer}</p>
            </details>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
