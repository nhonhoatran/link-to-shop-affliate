import { render, screen } from '@testing-library/react';
import { sampleHomeSections } from '@under30ss/shared/fixtures';
import { COMMITMENT_ICONS, type HomeSectionOf } from '@under30ss/shared';
import { describe, expect, it } from 'vitest';
import { COMMITMENT_ICON_COMPONENTS } from '@/components/home-sections/commitment-icons';
import { CommitmentsView } from '@/components/home-sections/commitments-view';

const base = sampleHomeSections.find((s): s is HomeSectionOf<'Commitments'> => s.type === 'Commitments');
if (!base) throw new Error('fixture missing Commitments');

describe('CommitmentsView', () => {
  it('renders each commitment with a decorative icon, title and text', () => {
    const { container } = render(
      <CommitmentsView section={base} headingId="section-c" priority={false} siteUrl="https://x.test" mode="public" />,
    );
    expect(screen.getByRole('region', { name: 'Cam kết' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Giao nhanh')).toBeInTheDocument();
    expect(screen.getByText('Chính hãng')).toBeInTheDocument();
    container.querySelectorAll('svg').forEach((svg) => expect(svg).toHaveAttribute('aria-hidden', 'true'));
  });

  it('sizes the row to the number of commitments', () => {
    const four = { ...base, props: { ...base.props, items: Array.from({ length: 4 }, () => base.props.items[0]!) } };
    const { container } = render(
      <CommitmentsView section={four} headingId="section-c" priority={false} siteUrl="https://x.test" mode="public" />,
    );
    expect((container.querySelector('ul') as HTMLElement).style.getPropertyValue('--commitment-columns')).toBe('4');
  });

  it('maps every icon key the contract allows', () => {
    for (const key of COMMITMENT_ICONS) expect(COMMITMENT_ICON_COMPONENTS[key]).toBeDefined();
  });
});
