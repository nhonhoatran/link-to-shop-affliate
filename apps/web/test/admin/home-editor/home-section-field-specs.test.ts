import { describe, expect, it } from 'vitest';
import {
  COMMITMENT_ICONS,
  HOME_SECTION_DEFAULTS,
  HOME_SECTION_TYPES,
  MAX_COMMITMENTS,
  MAX_FAQ_ITEMS,
  MAX_HERO_SLIDES,
  MIN_COMMITMENTS,
  commitmentItemSchema,
  faqItemSchema,
  heroSlideSchema,
  homeSectionSchema,
  type HomeSectionType,
} from '@under30ss/shared';
import type { ArraySpec, FieldSpec } from '@/components/admin/home-editor/field-spec-types';
import { HOME_SECTION_FIELD_SPECS } from '@/components/admin/home-editor/home-section-field-specs';
import { sampleSection } from './home-editor-fixture';

const propKeys = (type: HomeSectionType): string[] => {
  const option = homeSectionSchema.options.find((candidate) => candidate.shape.type.value === type);
  if (!option) throw new Error(`No schema for ${type}`);
  return Object.keys(option.shape.props.shape).filter((key) => key !== 'id' && key !== 'visible');
};

const names = (specs: readonly FieldSpec[]) => specs.map((spec) => spec.name).sort();
const arraySpec = (type: HomeSectionType, name: string): ArraySpec => {
  const found = HOME_SECTION_FIELD_SPECS[type].find((spec) => spec.name === name);
  if (!found || found.kind !== 'array') throw new Error(`No array spec ${type}.${name}`);
  return found;
};

describe('HOME_SECTION_FIELD_SPECS', () => {
  it.each(HOME_SECTION_TYPES)('%s has a field for every prop of its schema', (type) => {
    expect(names(HOME_SECTION_FIELD_SPECS[type])).toEqual([...propKeys(type)].sort());
  });

  it('covers the item fields of every repeatable group', () => {
    expect(names(arraySpec('HeroSlider', 'slides').fields)).toEqual(Object.keys(heroSlideSchema.shape).sort());
    expect(names(arraySpec('Faq', 'items').fields)).toEqual(Object.keys(faqItemSchema.shape).sort());
    expect(names(arraySpec('Commitments', 'items').fields)).toEqual(Object.keys(commitmentItemSchema.shape).sort());
  });

  it('takes the repeatable-group limits from shared', () => {
    expect(arraySpec('HeroSlider', 'slides')).toMatchObject({ min: 1, max: MAX_HERO_SLIDES });
    expect(arraySpec('Faq', 'items')).toMatchObject({ min: 1, max: MAX_FAQ_ITEMS });
    expect(arraySpec('Commitments', 'items')).toMatchObject({ min: MIN_COMMITMENTS, max: MAX_COMMITMENTS });
  });

  it('starts new items from the shared defaults', () => {
    expect(arraySpec('Faq', 'items').create?.()).toEqual(HOME_SECTION_DEFAULTS.Faq.items[0]);
    const commitment = arraySpec('Commitments', 'items').create?.();
    expect(COMMITMENT_ICONS).toContain(commitment?.icon);
    expect(commitment).toMatchObject({ title: '', text: '' });
  });

  it('creates a slide from an uploaded image', () => {
    const image = { key: 'k', width: 10, height: 20, url: '/m/k.webp' };
    expect(arraySpec('HeroSlider', 'slides').createFromImage?.(image)).toEqual({ image, alt: '' });
  });

  it('only offers select values the schema accepts', () => {
    for (const type of HOME_SECTION_TYPES) {
      for (const spec of HOME_SECTION_FIELD_SPECS[type]) {
        if (spec.kind !== 'select') continue;
        for (const option of spec.options) {
          const sample = sampleSection(type);
          const candidate = { ...sample, props: { ...sample.props, [spec.name]: option.value } };
          expect(homeSectionSchema.safeParse(candidate).success, `${type}.${spec.name}=${option.value}`).toBe(true);
        }
      }
    }
  });

  it('shows fields that depend on a choice only for that choice', () => {
    const outfitList = HOME_SECTION_FIELD_SPECS.OutfitList;
    const visible = (values: Record<string, unknown>) =>
      outfitList.filter((spec) => !spec.showIf || spec.showIf(values)).map((spec) => spec.name);
    expect(visible({ source: 'latest', display: 'carousel' })).not.toContain('outfitIds');
    expect(visible({ source: 'manual', display: 'grid' })).toEqual(expect.arrayContaining(['outfitIds', 'columnsDesktop']));
    expect(visible({ source: 'collection', display: 'carousel' })).toEqual(expect.arrayContaining(['collectionIds']));
    expect(visible({ source: 'collection', display: 'carousel' })).not.toContain('columnsDesktop');
  });
});
