import type { FaqItem } from '@under30ss/shared';
import { buildFaqJsonLd } from './build-faq-json-ld';
import { serializeJsonLd } from './build-outfit-json-ld';

export function FaqJsonLdScript({ items }: { items: readonly FaqItem[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildFaqJsonLd(items)) }} />;
}
