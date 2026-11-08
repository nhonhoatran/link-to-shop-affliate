import { type AdminHomeLayoutDto, type HomeSection, type HomeSectionType } from '@under30ss/shared';
import { sampleEditorialHomeSections, sampleHomeSections } from '@under30ss/shared/fixtures';

export const sampleSection = (type: HomeSectionType): HomeSection => {
  const found = [...sampleHomeSections, ...sampleEditorialHomeSections].find((section) => section.type === type);
  if (!found) throw new Error(`No sample for ${type}`);
  return structuredClone(found);
};

export const sampleContent = (): HomeSection[] => structuredClone(sampleHomeSections);

export const adminHomeDto = (overrides: Partial<AdminHomeLayoutDto> = {}): AdminHomeLayoutDto => ({
  draft: sampleContent(),
  draftUpdatedAt: '2026-11-07T01:00:00.000Z',
  publishedAt: null,
  previous: null,
  hasUnpublishedChanges: false,
  usingDefault: true,
  ...overrides,
});
