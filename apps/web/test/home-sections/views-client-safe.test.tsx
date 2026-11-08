import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/react';
import { sampleResolvedEditorialSections, sampleResolvedHomeSections } from '@under30ss/shared/fixtures';
import type { ComponentType } from 'react';
import type { ResolvedHomeSection } from '@under30ss/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HOME_SECTION_VIEWS } from '@/components/home-sections/home-section-views';
import type { SectionMode, SectionViewProps } from '@/components/home-sections/section-shell';

const VIEWS_DIR = join(__dirname, '../../src/components/home-sections');

afterEach(() => vi.restoreAllMocks());

describe('home section views are client-safe', () => {
  it.each(['public', 'preview'] as SectionMode[])('renders every type in %s mode without fetching', (mode) => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    for (const section of [...sampleResolvedHomeSections, ...sampleResolvedEditorialSections]) {
      const View = HOME_SECTION_VIEWS[section.type] as ComponentType<SectionViewProps<ResolvedHomeSection>>;
      const { container, unmount } = render(
        <View
          section={section}
          headingId={`h-${section.props.id}`}
          priority={false}
          siteUrl="https://x.test"
          mode={mode}
          newsletter={{ action: vi.fn() }}
        />,
      );
      expect(container.querySelector(`[data-section-id="${section.props.id}"]`)).not.toBeNull();
      if (mode === 'preview') expect(container.querySelector('script[type="application/ld+json"]')).toBeNull();
      unmount();
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    if (mode === 'preview') expect(setIntervalSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('imports nothing that is server-only', () => {
    const forbidden = /next\/headers|api-client-server|web-env|public-data-loaders|public-home-loaders/;
    const files = readdirSync(VIEWS_DIR).filter((name) => /\.(ts|tsx)$/.test(name));
    expect(files.length).toBeGreaterThan(20);
    for (const file of files) {
      expect(readFileSync(join(VIEWS_DIR, file), 'utf8'), file).not.toMatch(forbidden);
    }
  });
});
