import { render, screen } from '@testing-library/react';
import { sampleResolvedEditorialSections } from '@under30ss/shared/fixtures';
import type { HomeSectionOf } from '@under30ss/shared';
import { describe, expect, it } from 'vitest';
import { MarqueeView } from '@/components/home-sections/marquee-view';

const base = sampleResolvedEditorialSections.find((s): s is HomeSectionOf<'Marquee'> => s.type === 'Marquee');
if (!base) throw new Error('fixture missing Marquee');

const renderMarquee = (props: Partial<HomeSectionOf<'Marquee'>['props']> = {}) =>
  render(
    <MarqueeView
      section={{ ...base, props: { ...base.props, ...props } }}
      headingId="section-marquee"
      priority={false}
      siteUrl="https://shop.example.test"
      mode="public"
    />,
  );

describe('MarqueeView', () => {
  it('is a labelled region with the items in two groups, the second hidden from assistive tech', () => {
    const { container } = renderMarquee();
    expect(screen.getByRole('region', { name: base.props.label })).toBeInTheDocument();
    const groups = container.querySelectorAll('ul');
    expect(groups).toHaveLength(2);
    expect(groups[0]).not.toHaveAttribute('aria-hidden');
    expect(groups[1]).toHaveAttribute('aria-hidden', 'true');
    expect([...groups[0]!.querySelectorAll('li')].map((li) => li.textContent)).toEqual(base.props.items.map((item) => item.text));
    expect(groups[1]!.querySelectorAll('a, button, input')).toHaveLength(0);
  });

  it('falls back to a default region name when the label is empty', () => {
    renderMarquee({ label: undefined });
    expect(screen.getByRole('region', { name: 'Thông điệp cửa hàng' })).toBeInTheDocument();
  });

  it('renders no control: hovering pauses the strip in CSS', () => {
    const { container } = renderMarquee();
    expect(container.querySelectorAll('button, input, label')).toHaveLength(0);
  });

  it('takes the animation duration from the section props', () => {
    const { container } = renderMarquee({ durationSeconds: 45 });
    expect(container.querySelector<HTMLElement>('[style]')?.style.getPropertyValue('--marquee-duration')).toBe('45s');
  });
});
