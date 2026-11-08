import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { samplePublicAnnouncement } from '@under30ss/shared/fixtures';
import { MotionProvider } from '@/components/motion/motion-provider';
import { PublicShell } from '@/components/public/public-shell';
import { SiteAnnouncementBar } from '@/components/public/site-announcement-bar';

const { usePathname, getPublicSettings } = vi.hoisted(() => ({ usePathname: vi.fn(), getPublicSettings: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname }));
vi.mock('@/lib/seo/public-data-loaders', () => ({ getPublicSettings }));

const baseSettings = {
  siteName: 'Shop',
  seoTitle: 'Shop',
  seoDescription: 'About',
  ogImageUrl: null,
  looksPageSize: 12,
  relatedOutfitsCount: 4,
};

beforeEach(() => {
  usePathname.mockReset().mockReturnValue('/');
  getPublicSettings.mockReset();
});

const renderShell = async () =>
  render(<MotionProvider>{await PublicShell({ children: <p>Nội dung</p> })}</MotionProvider>);

describe('SiteAnnouncementBar', () => {
  it('shows the text and an internal link in a labelled aside', () => {
    render(<SiteAnnouncementBar announcement={samplePublicAnnouncement} />);
    const bar = screen.getByRole('complementary', { name: 'Thông báo' });
    expect(bar).toHaveTextContent(samplePublicAnnouncement.text);
    const link = screen.getByRole('link', { name: samplePublicAnnouncement.linkLabel! });
    expect(link).toHaveAttribute('href', samplePublicAnnouncement.href);
    expect(link).not.toHaveAttribute('rel');
  });

  it('marks an external link with rel', () => {
    render(<SiteAnnouncementBar announcement={{ text: 'Sale', linkLabel: 'Mua', href: 'https://shop.example.com' }} />);
    expect(screen.getByRole('link', { name: 'Mua' })).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows only the text when there is no link', () => {
    render(<SiteAnnouncementBar announcement={{ text: 'Chỉ có chữ' }} />);
    expect(screen.getByText('Chỉ có chữ')).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('does not render a link label without a link target', () => {
    render(<SiteAnnouncementBar announcement={{ text: 'Sale', linkLabel: 'Mua' }} />);
    expect(screen.queryByText('Mua')).toBeNull();
  });
});

describe('PublicShell chrome', () => {
  it('renders no bar for a null or missing announcement', async () => {
    getPublicSettings.mockResolvedValue({ ...baseSettings, announcement: null });
    const { unmount } = await renderShell();
    expect(screen.queryByRole('complementary')).toBeNull();
    unmount();

    getPublicSettings.mockResolvedValue(baseSettings);
    await renderShell();
    expect(screen.queryByRole('complementary')).toBeNull();
  });

  it('puts the skip link first, then the bar, then the header', async () => {
    getPublicSettings.mockResolvedValue({ ...baseSettings, announcement: samplePublicAnnouncement });
    const { container } = await renderShell();
    const order = [...container.querySelectorAll('a[href="#main"], aside, header')].map((el) => el.tagName);
    expect(order).toEqual(['A', 'ASIDE', 'HEADER']);
    expect(screen.getByRole('link', { name: 'Bỏ qua tới nội dung' })).toBeInTheDocument();
  });

  it('adds the collections link to header and footer from the settings', async () => {
    getPublicSettings.mockResolvedValue({ ...baseSettings, collectionsNavVisible: true, collectionsLabel: 'Bộ sưu tập hè' });
    await renderShell();
    expect(screen.getAllByRole('link', { name: 'Bộ sưu tập hè' })).toHaveLength(2);
  });

  it('falls back to a bare shell when settings fail to load', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    getPublicSettings.mockRejectedValue(new Error('api down'));
    await renderShell();
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Bộ sưu tập' })).toBeNull();
    expect(screen.getByText('Nội dung')).toBeInTheDocument();
    error.mockRestore();
  });
});
