import { render, screen } from '@testing-library/react';
import { sampleHomeSections } from '@under30ss/shared/fixtures';
import type { HomeSectionOf } from '@under30ss/shared';
import { describe, expect, it } from 'vitest';
import { TextWithImageView } from '@/components/home-sections/text-with-image-view';
import { splitParagraphs } from '@/components/home-sections/split-paragraphs';

const base = sampleHomeSections.find((s): s is HomeSectionOf<'TextWithImage'> => s.type === 'TextWithImage');
if (!base) throw new Error('fixture missing TextWithImage');

const renderView = (props: Partial<HomeSectionOf<'TextWithImage'>['props']> = {}, priority = false) =>
  render(
    <TextWithImageView
      section={{ ...base, props: { ...base.props, ...props } }}
      headingId="section-text"
      priority={priority}
      siteUrl="https://shop.example.test"
      mode="public"
    />,
  );

describe('splitParagraphs', () => {
  it('splits on blank lines and drops empty chunks', () => {
    expect(splitParagraphs('Một.\n\nHai.\r\n\r\n\n  \nBa.')).toEqual(['Một.', 'Hai.', 'Ba.']);
  });
});

describe('TextWithImageView', () => {
  it('renders the heading, one paragraph per block and the call to action', () => {
    const { container } = renderView();
    expect(screen.getByRole('heading', { level: 2, name: 'Về chúng tôi' })).toBeInTheDocument();
    expect(container.querySelectorAll('p')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Tìm hiểu thêm' })).toHaveAttribute('href', '/looks');
  });

  it('keeps markup in the text as plain text', () => {
    const { container } = renderView({ body: '<b>đậm</b> & <script>x</script>' });
    expect(container.querySelector('b')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(container).toHaveTextContent('<b>đậm</b> & <script>x</script>');
  });

  it('uses the alt text and only raises priority when it holds the LCP', () => {
    const { container, unmount } = renderView({}, true);
    const eager = container.querySelector('img');
    expect(eager).toHaveAttribute('alt', 'Góc cửa hàng');
    expect(eager).toHaveAttribute('fetchpriority', 'high');
    unmount();
    expect(renderView().container.querySelector('img')).toHaveAttribute('loading', 'lazy');
  });

  it('renders without an image or a call to action', () => {
    const { container } = renderView({ image: undefined, ctaLabel: undefined, ctaHref: undefined });
    expect(container.querySelector('img')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
