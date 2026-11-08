import { COLLECTIONS_PAGE_PATH, type HomeSectionOf, type PublicCollectionCardDto } from '@under30ss/shared';
import { CollectionCardGrid } from '@/components/public/collection-card-grid';
import { SectionShell, SectionViewAll, type SectionViewProps } from './section-shell';

type CollectionTilesSection = HomeSectionOf<'CollectionTiles'> & { data: { items: PublicCollectionCardDto[] } };

export function CollectionTilesView({ section, headingId, priority }: SectionViewProps<CollectionTilesSection>) {
  const { id, eyebrow, title, columnsDesktop, showViewAll } = section.props;
  const { items } = section.data;
  if (items.length === 0) return null;
  return (
    <SectionShell
      sectionId={id}
      headingId={headingId}
      eyebrow={eyebrow}
      title={title}
      action={showViewAll ? <SectionViewAll href={COLLECTIONS_PAGE_PATH} /> : undefined}
    >
      <CollectionCardGrid items={items} headingLevel="h3" columnsDesktop={columnsDesktop} highPriorityFirstRow={priority} />
    </SectionShell>
  );
}
