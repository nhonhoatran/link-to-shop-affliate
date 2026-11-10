import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FooterInput } from '@under30ss/shared';
import { buildPublicNavItems, type NavSettings } from '@/components/public/public-nav-items';
import { SiteFooter } from '@/components/public/site-footer';

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname }));

beforeEach(() => {
  usePathname.mockReset().mockReturnValue('/');
});

const footer: FooterInput = {
  columns: [
    {
      title: 'Về chúng tôi',
      links: [
        { label: 'Giới thiệu', href: '/about' },
        { label: 'Đối tác', href: 'https://partner.example.com/vn' },
      ],
    },
    { title: 'Hỗ trợ', links: [{ label: 'Liên hệ', href: '/contact' }] },
  ],
  social: [{ label: 'Facebook', href: 'https://facebook.com/shop' }],
};

const renderFooter = (props: { footer?: FooterInput; navSettings?: NavSettings } = {}) =>
  render(
    <SiteFooter
      siteName="Shop"
      description="About text"
      navItems={buildPublicNavItems(props.navSettings)}
      footer={props.footer}
    />,
  );

describe('SiteFooter', () => {
  it('has the site name, description, nav links and the current year', () => {
    renderFooter();
    expect(screen.getByText('About text')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tất cả outfit' })).toHaveAttribute('href', '/looks');
    expect(screen.getByText(`© ${new Date().getFullYear()} Shop`)).toBeInTheDocument();
  });

  it('stays the contentinfo landmark when rendered inside main, as the feed does', () => {
    render(
      <main>
        <SiteFooter siteName="Shop" description="About text" navItems={buildPublicNavItems()} insideMain />
      </main>,
    );
    expect(screen.getByRole('contentinfo')).toHaveTextContent('About text');
  });

  it('renders the site name as a decorative wordmark hidden from assistive tech', () => {
    const { container } = renderFooter();
    const wordmark = container.querySelector('[aria-hidden="true"]');
    expect(wordmark).toHaveTextContent('Shop');
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it('is unchanged when no columns or social links are configured', () => {
    const { container } = renderFooter({ footer: { columns: [], social: [] } });
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.queryByRole('list')).toBeNull();
    expect(container.querySelectorAll('a')).toHaveLength(2);
  });

  it('shows the same nav items as the header, including the collections link', () => {
    renderFooter({ navSettings: { collectionsNavVisible: true, collectionsLabel: 'Bộ sưu tập hè' } });
    expect(screen.getByRole('link', { name: 'Bộ sưu tập hè' })).toHaveAttribute('href', '/collections');
  });

  it('renders each column with a title and its links, external ones with rel', () => {
    renderFooter({ footer });
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Về chúng tôi', 'Hỗ trợ']);
    const internal = screen.getByRole('link', { name: 'Giới thiệu' });
    expect(internal).toHaveAttribute('href', '/about');
    expect(internal).not.toHaveAttribute('rel');
    expect(screen.getByRole('link', { name: 'Đối tác' })).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders social links as text links with rel, in a new tab', () => {
    renderFooter({ footer });
    const list = screen.getByRole('list', { name: 'Mạng xã hội' });
    const facebook = within(list).getByRole('link', { name: 'Facebook' });
    expect(facebook).toHaveAttribute('href', 'https://facebook.com/shop');
    expect(facebook).toHaveAttribute('rel', 'noopener noreferrer');
    expect(facebook).toHaveAttribute('target', '_blank');
  });

  it('never renders an unsafe link as a link', () => {
    renderFooter({ footer: { columns: [], social: [{ label: 'Bad', href: 'javascript:alert(1)' }] } });
    expect(screen.queryByRole('link', { name: 'Bad' })).toBeNull();
    expect(screen.getByText('Bad')).toBeInTheDocument();
  });
});
