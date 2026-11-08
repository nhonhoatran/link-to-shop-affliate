import { render, screen } from '@testing-library/react';
import { sampleHomeSections } from '@under30ss/shared/fixtures';
import type { HomeSectionOf } from '@under30ss/shared';
import { describe, expect, it } from 'vitest';
import { FaqView } from '@/components/home-sections/faq-view';

const base = sampleHomeSections.find((s): s is HomeSectionOf<'Faq'> => s.type === 'Faq');
if (!base) throw new Error('fixture missing Faq');

const renderFaq = (mode: 'public' | 'preview', items = base.props.items) =>
  render(
    <FaqView
      section={{ ...base, props: { ...base.props, items } }}
      headingId="section-faq"
      priority={false}
      siteUrl="https://shop.example.test"
      mode={mode}
    />,
  );

describe('FaqView', () => {
  it('renders every question as a native details element with its answer in the HTML', () => {
    const { container } = renderFaq('public');
    expect(screen.getByRole('heading', { level: 2, name: 'Câu hỏi thường gặp' })).toBeInTheDocument();
    const details = container.querySelectorAll('details');
    expect(details).toHaveLength(2);
    expect(details[0]?.querySelector('summary')).toHaveTextContent('Mua hàng ở đâu?');
    expect(details[0]).toHaveTextContent('Bấm vào món đồ để sang trang bán.');
    expect(details[0]).not.toHaveAttribute('open');
  });

  it('emits FAQPage JSON-LD that cannot close the script tag', () => {
    const { container } = renderFaq('public', [{ question: 'Q?', answer: 'A </script><b>x</b>' }]);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script?.innerHTML).not.toContain('</script');
    const data = JSON.parse(script?.textContent ?? '{}');
    expect(data['@type']).toBe('FAQPage');
    expect(data.mainEntity[0].acceptedAnswer.text).toBe('A </script><b>x</b>');
  });

  it('omits structured data in preview', () => {
    const { container } = renderFaq('preview');
    expect(container.querySelector('script')).toBeNull();
  });
});
