import type { PublicOutfitDto } from '@under30ss/shared';
import { buildOutfitJsonLd, serializeJsonLd } from './build-outfit-json-ld';

interface OutfitJsonLdScriptProps {
  outfit: PublicOutfitDto;
  siteUrl: string;
  description?: string;
}

export function OutfitJsonLdScript({ outfit, siteUrl, description }: OutfitJsonLdScriptProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildOutfitJsonLd(outfit, siteUrl, description)) }}
    />
  );
}
