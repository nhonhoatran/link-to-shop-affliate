import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PublicSmartLink } from '@/components/public/public-smart-link';

describe('PublicSmartLink', () => {
  it('renders an internal path as a plain link without rel', () => {
    render(<PublicSmartLink href="/collections/ao-thun?page=2">Xem</PublicSmartLink>);
    const link = screen.getByRole('link', { name: 'Xem' });
    expect(link).toHaveAttribute('href', '/collections/ao-thun?page=2');
    expect(link).not.toHaveAttribute('rel');
  });

  it('adds rel noopener noreferrer to an external URL', () => {
    render(<PublicSmartLink href="https://shopee.vn/shop">Shopee</PublicSmartLink>);
    const link = screen.getByRole('link', { name: 'Shopee' });
    expect(link).toHaveAttribute('href', 'https://shopee.vn/shop');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('opens an external URL in a new tab only when asked, never an internal path', () => {
    render(
      <>
        <PublicSmartLink href="https://facebook.com/shop" newTab>
          Facebook
        </PublicSmartLink>
        <PublicSmartLink href="/looks" newTab>
          Looks
        </PublicSmartLink>
        <PublicSmartLink href="https://shopee.vn/shop">Shopee</PublicSmartLink>
      </>,
    );
    expect(screen.getByRole('link', { name: 'Facebook' })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: 'Looks' })).not.toHaveAttribute('target');
    expect(screen.getByRole('link', { name: 'Shopee' })).not.toHaveAttribute('target');
  });

  it('keeps the rel even when the caller passes other attributes', () => {
    render(
      <PublicSmartLink href="https://example.com" className="pill" aria-label="Ngoài">
        x
      </PublicSmartLink>,
    );
    const link = screen.getByRole('link', { name: 'Ngoài' });
    expect(link).toHaveClass('pill');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it.each(['javascript:alert(1)', '//evil.example', 'data:text/html,x', '/a b', ''])(
    'renders %j as inert text, not a link',
    (href) => {
      render(
        <PublicSmartLink href={href} className="pill">
          Bad
        </PublicSmartLink>,
      );
      expect(screen.queryByRole('link')).toBeNull();
      expect(screen.getByText('Bad')).toHaveClass('pill');
    },
  );
});
