import { COLLECTIONS_PAGE_PATH, type HomeSectionOf, type PublicCollectionCardDto } from '@under30ss/shared';
import { CollectionCardGrid } from '@/components/public/collection-card-grid';
import { SectionShell, SectionViewAll, type SectionViewProps } from './section-shell';

type CollectionTilesSection = HomeSectionOf<'CollectionTiles'> & { data: { items: PublicCollectionCardDto[] } };

export function CollectionTilesView({ section, headingId, priority }: SectionViewProps<CollectionTilesSection>) {
  const { id, title, columnsDesktop, showViewAll } = section.props;
  const { items } = section.data;
  if (items.length === 0) return null;
  return (
    <SectionShell sectionId={id} headingId={headingId} title={title}>
      <CollectionCardGrid items={items} headingLevel="h3" columnsDesktop={columnsDesktop} highPriorityFirstRow={priority} />
      {showViewAll ? <SectionViewAll href={COLLECTIONS_PAGE_PATH} /> : null}
    </SectionShell>
  );
}
