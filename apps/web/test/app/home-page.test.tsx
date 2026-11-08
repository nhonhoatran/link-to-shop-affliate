import { render } from '@testing-library/react';
import { DEFAULT_HOME_CONTENT, type ResolvedHomeSection } from '@under30ss/shared';
import { sampleOutfitCards, samplePublicOutfit, sampleResolvedEditorialSections } from '@under30ss/shared/fixtures';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import HomePage, { generateMetadata } from '@/app/(public)/page';

const { getHomePage, getPublicSettings } = vi.hoisted(() => ({
  getHomePage: vi.fn(),
  getPublicSettings: vi.fn(),
}));

vi.mock('@/lib/seo/public-data-loaders', () => ({ getPublicSettings }));
vi.mock('@/lib/seo/public-home-loaders', () => ({ getHomePage }));

const settings = {
  siteName: 'Shop',
  seoTitle: 'Shop title',
  seoDescription: 'Shop description',
  ogImageUrl: null,
  looksPageSize: 12,
  relatedOutfitsCount: 5,
};

// What the API resolves for the built-in default layout when the database has no published layout.
const defaultSections = (): ResolvedHomeSection[] => {
  const lookbook = DEFAULT_HOME_CONTENT.find((section) => section.type === 'FeaturedLookbook');
  const outfits = DEFAULT_HOME_CONTENT.find((section) => section.type === 'OutfitList');
  if (lookbook?.type !== 'FeaturedLookbook' || outfits?.type !== 'OutfitList') throw new Error('unexpected default layout');
  return [
    { ...lookbook, data: { outfit: samplePublicOutfit } },
    { ...outfits, data: { tabs: [{ key: 'latest', href: '/looks', items: sampleOutfitCards }] } },
  ];
};

const pageProps = (query: Record<string, string> = {}) => ({ searchParams: Promise.resolve(query) });

beforeAll(() => {
  vi.stubEnv('API_INTERNAL_URL', 'http://api.test:4000');
  vi.stubEnv('SITE_URL', 'https://shop.example.test');
  vi.stubEnv('MEDIA_PUBLIC_BASE_URL', '/media');
  vi.stubEnv('REVALIDATE_SECRET', 'test-secret-0123456789');
});

beforeEach(() => {
  getHomePage.mockReset();
  getPublicSettings.mockReset().mockResolvedValue(settings);
});

describe('/', () => {
  it('renders the default layout as the featured lookbook, then "Outfit khác" with a link to all looks', async () => {
    getHomePage.mockResolvedValue({ source: 'default', sections: defaultSections() });
    const { container } = render(await HomePage(pageProps()));
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(container.querySelector('h1')).toHaveTextContent('Shop title');
    expect(container.querySelector('[data-lookbook]')).not.toBeNull();
    expect(container.querySelector('[data-lookbook] h2')).toHaveTextContent(samplePublicOutfit.title);
    const heading = [...container.querySelectorAll('h2')].find((h) => h.textContent === 'Outfit khác');
    expect(heading).toBeDefined();
    expect(container.querySelector('a[href="/looks"]')).toHaveTextContent('Xem tất cả');
    expect(container.querySelector('script[type="application/ld+json"]')).not.toBeNull();
  });

  it('shows the newsletter result from the query and ignores unknown values', async () => {
    const signup = sampleResolvedEditorialSections.filter((section) => section.type === 'NewsletterSignup');
    getHomePage.mockResolvedValue({ source: 'published', sections: signup });
    const shown = render(await HomePage(pageProps({ newsletter: 'rate' })));
    expect(shown.container.querySelector('[role="status"]')).toHaveTextContent('quá nhanh');
    shown.unmount();
    const ignored = render(await HomePage(pageProps({ newsletter: '<script>' })));
    expect(ignored.container.querySelector('[role="status"]')).toBeEmptyDOMElement();
    expect(ignored.container.querySelector('form')).toHaveAttribute('action');
  });

  it('keeps the empty message when the API returns no sections', async () => {
    getHomePage.mockResolvedValue({ source: 'default', sections: [] });
    const { container } = render(await HomePage(pageProps()));
    expect(container.querySelector('[data-lookbook]')).toBeNull();
    expect(container.querySelector('h1')).toHaveTextContent('Chưa có outfit nào');
  });

  it('lets a loader failure propagate to the error boundary', async () => {
    getHomePage.mockRejectedValue(new Error('down'));
    await expect(HomePage(pageProps())).rejects.toThrow('down');
  });

  it('uses the site metadata', async () => {
    const metadata = await generateMetadata();
    expect(metadata.title).toBe('Shop title');
    expect(metadata.alternates?.canonical).toBe('https://shop.example.test/');
  });
});
