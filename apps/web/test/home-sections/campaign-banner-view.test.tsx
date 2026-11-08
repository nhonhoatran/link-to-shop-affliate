import { render, screen } from '@testing-library/react';
import { sampleResolvedEditorialSections } from '@under30ss/shared/fixtures';
import type { HomeSectionOf } from '@under30ss/shared';
import { describe, expect, it } from 'vitest';
import { CampaignBannerView } from '@/components/home-sections/campaign-banner-view';

const base = sampleResolvedEditorialSections.find((s): s is HomeSectionOf<'CampaignBanner'> => s.type === 'CampaignBanner');
if (!base) throw new Error('fixture missing CampaignBanner');

const renderBanner = (props: Partial<HomeSectionOf<'CampaignBanner'>['props']> = {}) =>
  render(
    <CampaignBannerView
      section={{ ...base, props: { ...base.props, ...props } }}
      headingId="section-banner"
      priority={false}
      siteUrl="https://shop.example.test"
      mode="public"
    />,
  );

describe('CampaignBannerView', () => {
  it('shows eyebrow, heading, body, the call to action and the photo with its alt text', () => {
    const { container } = renderBanner();
    expect(screen.getByText(base.props.eyebrow!)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: base.props.heading })).toBeInTheDocument();
    expect(screen.getByText(base.props.body!)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: base.props.ctaLabel! })).toHaveAttribute('href', base.props.ctaHref);
    expect(container.querySelector('img')).toHaveAttribute('alt', base.props.alt);
    expect(screen.getByRole('region', { name: base.props.heading })).toBeInTheDocument();
  });

  it('omits the optional parts', () => {
    const { container } = renderBanner({ eyebrow: undefined, body: undefined, ctaLabel: undefined, ctaHref: undefined });
    expect(container.querySelectorAll('p')).toHaveLength(0);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('keeps the photo lazy unless it is the LCP candidate', () => {
    const { container } = renderBanner();
    expect(container.querySelector('img')).toHaveAttribute('loading', 'lazy');
  });

  it('renders nothing while the image is not uploaded', () => {
    const { container } = renderBanner({ image: { ...base.props.image, url: undefined } });
    expect(container).toBeEmptyDOMElement();
  });
});
