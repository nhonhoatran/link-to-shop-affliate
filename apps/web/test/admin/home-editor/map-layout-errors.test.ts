import { describe, expect, it } from 'vitest';
import {
  firstErrorSectionId,
  sectionErrors,
  sectionIdsWithErrors,
  validateLayout,
  validateSection,
} from '@/components/admin/home-editor/map-layout-errors';
import { createSection } from '@/components/admin/home-editor/use-home-layout-state';
import { sampleContent, sampleSection } from './home-editor-fixture';

describe('validateLayout', () => {
  it('has no errors for a valid layout', () => {
    expect(validateLayout(sampleContent())).toEqual({});
  });

  it('puts a bad link on the exact field of the exact section', () => {
    const content = sampleContent();
    const hero = content[0]!;
    if (hero.type !== 'HeroSlider') throw new Error('type');
    hero.props.slides[0]!.ctaHref = 'javascript:alert(1)';
    const errors = validateLayout(content);
    expect(errors['content.0.props.slides.0.ctaHref']).toMatch(/Link không hợp lệ/);
    expect(sectionErrors(errors, 0)).toEqual({ 'slides.0.ctaHref': errors['content.0.props.slides.0.ctaHref'] });
    expect(sectionErrors(errors, 1)).toEqual({});
  });

  it('describes array limits in items, not characters', () => {
    const commitments = sampleSection('Commitments');
    if (commitments.type !== 'Commitments') throw new Error('type');
    commitments.props.items = [];
    const errors = validateLayout([createSection('HeroSlider'), commitments]);
    expect(errors['content.0.props.slides']).toBe('Không được để trống');
    expect(errors['content.1.props.items']).toBe('Cần ít nhất 2 mục');
  });

  it('asks for a number or the allowed autoplay range', () => {
    const content = sampleContent();
    const hero = content[0]!;
    if (hero.type !== 'HeroSlider') throw new Error('type');
    hero.props.autoplaySeconds = 1;
    expect(validateLayout(content)['content.0.props.autoplaySeconds']).toMatch(/Nhập 0 để tắt/);
    (hero.props as { autoplaySeconds?: number }).autoplaySeconds = undefined;
    expect(validateLayout(content)['content.0.props.autoplaySeconds']).toBe('Nhập một số');
  });

  it('reports required text as empty', () => {
    expect(validateLayout([createSection('TextWithImage')])['content.0.props.heading']).toBe('Không được để trống');
  });
});

describe('error sections', () => {
  it('lists the ids of sections with errors and the first one in order', () => {
    const content = [createSection('Faq'), sampleSection('Faq'), createSection('TextWithImage')];
    const errors = validateLayout(content);
    const ids = sectionIdsWithErrors(errors, content);
    expect(ids).toEqual(new Set([content[0]!.props.id, content[2]!.props.id]));
    expect(firstErrorSectionId(errors, content)).toBe(content[0]!.props.id);
    expect(firstErrorSectionId({}, content)).toBeNull();
  });
});

describe('validateSection', () => {
  it('keys errors relative to the props', () => {
    expect(validateSection(createSection('Faq'))).toHaveProperty(['items.0.question']);
  });
});
