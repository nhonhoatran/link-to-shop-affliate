import Link from 'next/link';
import { LOOKS_PAGE_PATH, type PublicOutfitCardDto } from '@under30ss/shared';
import { getRelatedOutfits } from '@/lib/seo/public-data-loaders';
import { OutfitCardGrid } from './outfit-card-grid';
import { RELATED_COPY } from './public-copy';
import buttonStyles from './public-button.module.css';
import styles from './related-outfits-section.module.css';

interface RelatedOutfitsSectionProps {
  count: number;
  excludeSlug?: string;
}

/** A secondary section: when the API fails it disappears instead of breaking the main look. */
async function loadRelatedOutfits(excludeSlug: string, count: number): Promise<PublicOutfitCardDto[]> {
  try {
    return await getRelatedOutfits(excludeSlug, count);
  } catch (error) {
    console.error('Failed to load related outfits', error);
    return [];
  }
}

export async function RelatedOutfitsSection({ count, excludeSlug = '' }: RelatedOutfitsSectionProps) {
  const items = await loadRelatedOutfits(excludeSlug, count);
  if (items.length === 0) return null;
  return (
    <section className={styles.section} aria-labelledby="related-outfits-title">
      <h2 id="related-outfits-title" className={styles.title}>
        {RELATED_COPY.title}
      </h2>
      <OutfitCardGrid items={items} headingLevel="h3" />
      <div className={styles.actions}>
        <Link href={LOOKS_PAGE_PATH} className={`${buttonStyles.button} ${buttonStyles.outline}`}>
          {RELATED_COPY.viewAll}
        </Link>
      </div>
    </section>
  );
}
