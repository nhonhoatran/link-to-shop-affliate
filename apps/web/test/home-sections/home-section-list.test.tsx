import { render } from '@testing-library/react';
import { sampleResolvedEditorialSections, sampleResolvedHomeSections } from '@under30ss/shared/fixtures';
import type { ResolvedHomeSection } from '@under30ss/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HomeSectionList } from '@/components/home-sections/home-section-list';

const SITE_URL = 'https://shop.example.test';

const renderList = (sections: readonly ResolvedHomeSection[], mode?: 'public' | 'preview') =>
  render(<HomeSectionList sections={sections} siteUrl={SITE_URL} seoTitle="Shop title" mode={mode} />);

afterEach(() => vi.restoreAllMocks());

describe('HomeSectionList', () => {
  it('renders one hidden h1 and the sections in the given order', () => {
    const { container } = renderList(sampleResolvedHomeSections);
    const h1s = container.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent('Shop title');
    const ids = [...container.querySelectorAll('section[data-section-id]')].map((el) => el.getAttribute('data-section-id'));
    expect(ids).toEqual(sampleResolvedHomeSections.map((section) => section.props.id));
  });

  it('names every section either with a visible h2 or an aria-label', () => {
    const { container } = renderList(sampleResolvedHomeSections);
    container.querySelectorAll('section[data-section-id]').forEach((el) => {
      const labelledBy = el.getAttribute('aria-labelledby');
      if (labelledBy) {
        expect(el.querySelector(`h2#${CSS.escape(labelledBy)}`)).not.toBeNull();
      } else {
        expect(el.getAttribute('aria-label')).toBeTruthy();
      }
    });
  });

  it('skips unknown section types with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const unknown = { type: 'Mystery', props: { id: 'x', visible: true } } as unknown as ResolvedHomeSection;
    const { container } = renderList([unknown, ...sampleResolvedHomeSections.slice(4, 5)]);
    expect(warn).toHaveBeenCalledOnce();
    expect(container.querySelectorAll('section[data-section-id]')).toHaveLength(1);
  });

  it('shows the empty message with its own h1 when there is nothing to render', () => {
    const { container } = renderList([]);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelector('h1')).toHaveTextContent('Chưa có outfit nào');
  });

  it('emits outfit and FAQ structured data on the public page only', () => {
    const publicTypes = [...renderList(sampleResolvedHomeSections).container.querySelectorAll('script[type="application/ld+json"]')].map(
      (el) => JSON.parse(el.textContent ?? '{}')['@type'],
    );
    expect(publicTypes.sort()).toEqual(['CollectionPage', 'FAQPage']);
    const preview = renderList(sampleResolvedHomeSections, 'preview').container;
    expect(preview.querySelector('script[type="application/ld+json"]')).toBeNull();
    expect(preview.querySelector('h1')).toBeNull();
  });

  it('gives the priority image to the first section that shows one, not to a text-only section above it', () => {
    const find = (type: string) => {
      const found = sampleResolvedEditorialSections.find((section) => section.type === type);
      if (!found) throw new Error(`fixture missing ${type}`);
      return found;
    };
    const { container } = renderList([find('Marquee'), find('NewsletterSignup'), find('Gallery'), find('CampaignBanner')]);
    const eager = [...container.querySelectorAll('img')].filter((img) => img.getAttribute('loading') !== 'lazy');
    expect(eager).toHaveLength(1);
    expect(eager[0]?.closest('[data-section-id]')).toHaveAttribute('data-section-id', 'sample-gallery');
  });

  it('hands the newsletter form state to the signup view', () => {
    const action = vi.fn();
    const sections = sampleResolvedEditorialSections.filter((section) => section.type === 'NewsletterSignup');
    const { container } = render(
      <HomeSectionList sections={sections} siteUrl={SITE_URL} seoTitle="Shop title" newsletter={{ action, result: 'invalid' }} />,
    );
    expect(container.querySelector('[role="status"]')).toHaveTextContent('chưa hợp lệ');
    expect(container.querySelector('button[type="submit"]')).toBeEnabled();
  });
});
