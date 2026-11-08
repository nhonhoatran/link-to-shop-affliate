import { LOOKS_PAGE_PATH, type HomeSectionOf, type OutfitListTabData } from '@under30ss/shared';
import { OutfitCardGrid } from '@/components/public/outfit-card-grid';
import { HOME_SECTION_COPY } from './home-section-copy';
import { OutfitCardRail } from './outfit-card-rail';
import { OutfitListTabs } from './outfit-list-tabs';
import { SectionShell, SectionViewAll, type SectionViewProps } from './section-shell';

type OutfitListSection = HomeSectionOf<'OutfitList'> & { data: { tabs: OutfitListTabData[] } };

function TabPanel({ tab, section, priority }: { tab: OutfitListTabData; section: OutfitListSection; priority: boolean }) {
  const { title, display, columnsDesktop, showViewAll, source } = section.props;
  // The API fills `href` for the latest list; the fallback keeps the link if an older API omits it.
  const href = tab.href ?? (source === 'latest' ? LOOKS_PAGE_PATH : undefined);
  return (
    <>
      {display === 'grid' ? (
        <OutfitCardGrid items={tab.items} headingLevel="h3" columnsDesktop={columnsDesktop} highPriorityFirstRow={priority} />
      ) : (
        <OutfitCardRail items={tab.items} label={tab.label ?? title} />
      )}
      {showViewAll && href ? <SectionViewAll href={href} /> : null}
    </>
  );
}

export function OutfitListView({ section, headingId, priority }: SectionViewProps<OutfitListSection>) {
  const { id, title } = section.props;
  const tabs = section.data.tabs.filter((tab) => tab.items.length > 0);
  if (tabs.length === 0) return null;
  const firstTab = tabs[0];
  return (
    <SectionShell sectionId={id} headingId={headingId} title={title}>
      {tabs.length === 1 && firstTab ? (
        <TabPanel tab={firstTab} section={section} priority={priority} />
      ) : (
        <OutfitListTabs
          groupName={`tabs-${id}`}
          groupLabel={title}
          tabs={tabs.map((tab, index) => ({
            key: tab.key,
            label: tab.label ?? HOME_SECTION_COPY.tabs.fallbackLabel(index + 1),
            panel: <TabPanel tab={tab} section={section} priority={priority && index === 0} />,
          }))}
        />
      )}
    </SectionShell>
  );
}
