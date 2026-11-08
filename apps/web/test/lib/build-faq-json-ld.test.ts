import { describe, expect, it } from 'vitest';
import { buildFaqJsonLd } from '@/lib/seo/build-faq-json-ld';

describe('buildFaqJsonLd', () => {
  it('maps each item to a Question with an accepted Answer', () => {
    expect(buildFaqJsonLd([{ question: 'Có mất phí không?', answer: 'Không.' }])).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        { '@type': 'Question', name: 'Có mất phí không?', acceptedAnswer: { '@type': 'Answer', text: 'Không.' } },
      ],
    });
  });

  it('keeps the order of the items', () => {
    const names = buildFaqJsonLd([
      { question: 'A', answer: '1' },
      { question: 'B', answer: '2' },
    ]).mainEntity.map((entity) => entity.name);
    expect(names).toEqual(['A', 'B']);
  });
});
