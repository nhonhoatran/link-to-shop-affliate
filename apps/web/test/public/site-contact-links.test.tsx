import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SiteContactLinks } from '@/components/public/site-contact-links';

describe('SiteContactLinks', () => {
  it('renders nothing when contacts are missing or blank', () => {
    const { container, rerender } = render(<SiteContactLinks />);
    expect(container).toBeEmptyDOMElement();
    rerender(<SiteContactLinks email=" " phone="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows contact values with mail and normalized telephone links', () => {
    render(<SiteContactLinks email="hello+shop@example.com" phone="+84 (90) 123-4567" />);
    expect(screen.getByRole('heading', { name: 'Liên hệ' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'hello+shop@example.com' })).toHaveAttribute('href', 'mailto:hello%2Bshop@example.com');
    expect(screen.getByRole('link', { name: '+84 (90) 123-4567' })).toHaveAttribute('href', 'tel:+84901234567');
  });

  it('supports either field alone and hides invalid persisted values', () => {
    const { rerender } = render(<SiteContactLinks email="hello@example.com" />);
    expect(screen.getAllByRole('link')).toHaveLength(1);
    rerender(<SiteContactLinks email="javascript:alert(1)" phone="090 123 4567" />);
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link')).toHaveAttribute('href', 'tel:0901234567');
  });
});
